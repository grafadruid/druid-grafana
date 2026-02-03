import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';

const druidVariableRegex = /\"\[\[(\w+)(?::druid:(\w+))?\]\]\"|\"\${(\w+)(?::druid:(\w+))?}\"/g;

/**
 * Returns which attributes of a filter should have template variables substituted.
 * For json filters only 'value' is substituted, so that a variable like $domain_filter
 * (whose value is a JSON string) is replaced as a string; later the backend parses it.
 */
function getFilterSubstituteAttrs(filterType: string): string[] {
  let attrList: string[];
  switch (filterType) {
    case 'json':
      attrList = ['value'];
      break;
    default:
      attrList = [];
  }
  console.error('[Druid] getFilterSubstituteAttrs', { input: { filterType }, returned: { attrList } });
  return attrList;
}

/**
 * Replaces template variables only in the given attributes of obj.
 * Used for json filters so that filter.value (e.g. "$domain_filter") is replaced
 * with the variable's value (e.g. the JSON string) without breaking the query structure.
 */
function replaceTemplateValues(
  obj: Record<string, unknown>,
  scopedVars: ScopedVars | undefined,
  attrList: string[],
  templateSrv: { replace: (value: string, scopedVars?: ScopedVars) => string }
): void {
  const inputValues: Record<string, unknown> = {};
  const returnedValues: Record<string, unknown> = {};
  for (const attr of attrList) {
    const val = obj[attr];
    inputValues[attr] = val;
    if (typeof val === 'string') {
      const replaced = templateSrv.replace(val, scopedVars);
      obj[attr] = replaced;
      returnedValues[attr] = replaced;
    }
  }
  console.error('[Druid] replaceTemplateValues', {
    input: { objType: obj['type'], attrList, valuesBefore: inputValues, scopedVars },
    returned: { valuesAfter: returnedValues },
  });
}

/**
 * Recursively walks the filter tree and replaces template variables only in
 * type-specific attributes (e.g. for type "json" only in "value").
 */
function replaceFilterTreeTemplateValues(
  filter: unknown,
  scopedVars: ScopedVars | undefined,
  templateSrv: { replace: (value: string, scopedVars?: ScopedVars) => string }
): void {
  console.error('[Druid] replaceFilterTreeTemplateValues', { input: { filter, scopedVars } });
  if (filter == null || typeof filter !== 'object' || Array.isArray(filter)) {
    console.error('[Druid] replaceFilterTreeTemplateValues', { returned: 'early (null/not-object/array)' });
    return;
  }
  const f = filter as Record<string, unknown>;
  const ftype = f['type'];
  if (typeof ftype === 'string') {
    const attrList = getFilterSubstituteAttrs(ftype);
    if (attrList.length > 0) {
      replaceTemplateValues(f, scopedVars, attrList, templateSrv);
      console.error('[Druid] replaceFilterTreeTemplateValues', {
        returned: 'after replaceTemplateValues',
        filterAfter: JSON.parse(JSON.stringify(f)),
      });
    }
    if (ftype === 'and' || ftype === 'or') {
      const fields = f['fields'];
      if (Array.isArray(fields)) {
        for (const field of fields) {
          replaceFilterTreeTemplateValues(field, scopedVars, templateSrv);
        }
      }
    } else if (ftype === 'not') {
      replaceFilterTreeTemplateValues(f['field'], scopedVars, templateSrv);
    }
  }
}

export class DruidDataSource extends DataSourceWithBackend<DruidQuery, DruidSettings> {
  settingsData: DruidSettings;
  constructor(instanceSettings: DataSourceInstanceSettings<DruidSettings>) {
    super(instanceSettings);
    this.settingsData = instanceSettings.jsonData;
  }
  filterQuery(query: DruidQuery) {
    return !query.hide;
  }
  applyTemplateVariables(templatedQuery: DruidQuery, scopedVars?: ScopedVars) {
    console.error('[Druid] applyTemplateVariables received from Grafana:', {
      templatedQuery,
      scopedVars,
    });

    const templateSrv = getTemplateSrv();
    // Clone so we don't mutate the original; for json filters we substitute only in 'value'
    // so that a variable like $domain_filter (value = JSON string) becomes the string,
    // and the backend later JSON.parse(filter.value).
    const cloned = JSON.parse(JSON.stringify({ ...templatedQuery, expr: undefined }));
    const builder = cloned.builder;
    if (builder != null && builder.filter != null) {
      replaceFilterTreeTemplateValues(builder.filter, scopedVars, templateSrv);
    }
    let template = JSON.stringify(cloned).replace(
      druidVariableRegex,
      (match, variable1, format1, variable2, format2) => {
        if (format1 || format2 === 'json') {
          return '${' + (variable1 || variable2) + ':doublequote}';
        }
        return match;
      }
    );
    const result = { ...JSON.parse(templateSrv.replace(template, scopedVars)), expr: templatedQuery.expr };
    console.error('[Druid] applyTemplateVariables sending (after variable replacement):', result);
    return result;
  }
  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query)).then((response) => {
      return response as MetricFindValue[];
    });
  }

  async getDatasourceMetadata(datasourceName: string): Promise<any> {
    return this.getResource('datasource-metadata', { datasource: datasourceName }).then((response) => {
      return response as any;
    });
  }

  async listDatasources(): Promise<string[]> {
    return this.getResource('datasources', {}).then((response) => {
      return response as string[];
    });
  }
}
