import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';

const druidVariableRegex = /\"\[\[(\w+)(?::druid:(\w+))?\]\]\"|\"\${(\w+)(?::druid:(\w+))?}\"/g;

/** Filter value that means "remove this filter" before sending to Druid. */
const REMOVE_FILTER_VALUE = '_REMOVE_FILTER_';

/**
 * Returns true if this leaf filter should be removed (value or pattern is _REMOVE_FILTER_).
 */
function isFilterMarkedForRemoval(filter: unknown): boolean {
  if (filter == null || typeof filter !== 'object' || Array.isArray(filter)) return false;
  const f = filter as Record<string, unknown>;
  if (f['value'] === REMOVE_FILTER_VALUE) return true;
  if (f['pattern'] === REMOVE_FILTER_VALUE) return true;
  const values = f['values'];
  if (Array.isArray(values) && values.length === 1 && values[0] === REMOVE_FILTER_VALUE) return true;
  if (Array.isArray(values) && values.every((v) => v === REMOVE_FILTER_VALUE)) return true;
  // json filter: value is a string that parses to a filter; remove if that filter is _REMOVE_FILTER_
  if (f['type'] === 'json' && typeof f['value'] === 'string') {
    try {
      const inner = JSON.parse(f['value'] as string) as Record<string, unknown>;
      return inner['value'] === REMOVE_FILTER_VALUE || inner['pattern'] === REMOVE_FILTER_VALUE;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Removes filters with value _REMOVE_FILTER_ from the tree and collapses and/or.
 * Returns the new filter tree, or null if the whole filter should be omitted.
 */
function removeFiltersMarkedForRemoval(filter: unknown): unknown {
  if (filter == null || typeof filter !== 'object' || Array.isArray(filter)) return filter;
  const f = filter as Record<string, unknown>;
  const ftype = f['type'];
  if (typeof ftype !== 'string') return filter;

  if (ftype === 'and' || ftype === 'or') {
    const fields = f['fields'];
    if (!Array.isArray(fields)) return filter;
    const kept = fields
      .map((field) => removeFiltersMarkedForRemoval(field))
      .filter((field) => field != null && !isFilterMarkedForRemoval(field));
    if (kept.length === 0) return null;
    if (kept.length === 1) return kept[0];
    return { ...f, fields: kept };
  }
  if (ftype === 'not') {
    const inner = removeFiltersMarkedForRemoval(f['field']);
    if (inner == null || isFilterMarkedForRemoval(inner)) return null;
    return { ...f, field: inner };
  }

  if (isFilterMarkedForRemoval(filter)) return null;
  return filter;
}

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
  if (filter == null || typeof filter !== 'object' || Array.isArray(filter)) {
    return;
  }
  const f = filter as Record<string, unknown>;
  const ftype = f['type'];
  if (typeof ftype === 'string') {
    const attrList = getFilterSubstituteAttrs(ftype);
    if (attrList.length > 0) {
      replaceTemplateValues(f, scopedVars, attrList, templateSrv);
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

    // Build the payload that will be sent (backend uses expr when set). We only substitute
    // in this payload — never in query.builder state.
    let payload: { builder?: { filter?: unknown }; settings?: unknown };
    if (templatedQuery.expr && templatedQuery.expr.trim() !== '') {
      try {
        payload = JSON.parse(templatedQuery.expr);
      } catch {
        payload = { builder: templatedQuery.builder, settings: templatedQuery.settings };
      }
    } else {
      payload = JSON.parse(JSON.stringify({ builder: templatedQuery.builder, settings: templatedQuery.settings }));
      console.error('[Druid] applyTemplateVariables (no expr) payload:', { builderAfter: payload.builder });
    }
    console.error('[Druid][payload] applyTemplateVariables before full replacement:', { payload });
    if (payload.builder?.filter != null) {
      replaceFilterTreeTemplateValues(payload.builder.filter, scopedVars, templateSrv);
      const filterAfterRemoval = removeFiltersMarkedForRemoval(payload.builder.filter);
      payload.builder.filter = filterAfterRemoval ?? undefined;
    }

    let templateStr = JSON.stringify(payload).replace(
      druidVariableRegex,
      (match, variable1, format1, variable2, format2) => {
        if (format1 || format2 === 'json') {
          return '${' + (variable1 || variable2) + ':doublequote}';
        }
        return match;
      }
    );
    const substitutedStr = templateSrv.replace(templateStr, scopedVars);
    const substitutedPayload = JSON.parse(substitutedStr);
    // Preserve query metadata (refId, datasource, hide, etc.) so Grafana can match the response to the panel.
    const result = {
      ...templatedQuery,
      ...substitutedPayload,
      expr: templatedQuery.expr && templatedQuery.expr.trim() !== '' ? substitutedStr : templatedQuery.expr,
    };
    console.error('[Druid] applyTemplateVariables sending (after variable replacement):', result);
    return result;
  }
  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query)).then((response) => {
      console.error('[Druid] response from Druid (query-variable):', response);
      return response as MetricFindValue[];
    });
  }

  async getDatasourceMetadata(datasourceName: string): Promise<any> {
    return this.getResource('datasource-metadata', { datasource: datasourceName }).then((response) => {
      console.error('[Druid] response from Druid (datasource-metadata):', response);
      return response as any;
    });
  }

  async listDatasources(): Promise<string[]> {
    return this.getResource('datasources', {}).then((response) => {
      console.error('[Druid] response from Druid (datasources):', response);
      return response as string[];
    });
  }
}
