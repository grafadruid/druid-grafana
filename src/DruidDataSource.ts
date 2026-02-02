import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';

const druidVariableRegex = /\"\[\[(\w+)(?::druid:(\w+))?\]\]\"|\"\${(\w+)(?::druid:(\w+))?}\"/g;

/**
 * Recursively expand filter tree: replace any filter with type "json" by the parsed value
 * so the filter list contains only the actual filter object (e.g. selector), not {"type":"json","value":"..."}.
 */
function expandJsonFiltersInBuilder(obj: any): any {
  if (obj == null) return obj;
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (obj.type === 'json' && obj.value != null) {
      const val = obj.value;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '') return obj;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed != null && typeof parsed === 'object') {
            return parsed;
          }
        } catch {
          return obj;
        }
      }
      if (typeof val === 'object' && val !== null) return val;
      return obj;
    }
    if (obj.type === 'and' || obj.type === 'or') {
      const fields = obj.fields;
      if (Array.isArray(fields)) {
        return { ...obj, fields: fields.map((f: any) => expandJsonFiltersInBuilder(f)) };
      }
    }
    if (obj.type === 'not' && obj.field != null) {
      return { ...obj, field: expandJsonFiltersInBuilder(obj.field) };
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = expandJsonFiltersInBuilder(v);
    }
    return out;
  }
  if (Array.isArray(obj)) return obj.map((x) => expandJsonFiltersInBuilder(x));
  return obj;
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
    let template = JSON.stringify({ ...templatedQuery, expr: undefined }).replace(
      druidVariableRegex,
      (match, variable1, format1, variable2, format2) => {
        if (format1 || format2 === 'json') {
          return '${' + (variable1 || variable2) + ':doublequote}';
        }
        return match;
      }
    );

    // Helper: get variable value by name (from scopedVars or getVariables)
    const ts = templateSrv as { getVariables?: () => Array<{ name?: string; current?: { value?: unknown } }> };
    const variables = ts.getVariables?.() ?? [];
    const scoped = scopedVars ?? {};
    const getVariableValue = (name: string): unknown => {
      const scopedVal = name && (scoped[name] as { value?: unknown } | undefined);
      if (scopedVal?.value !== undefined) return scopedVal.value;
      const varObj = variables.find((v) => v?.name === name);
      return varObj?.current?.value;
    };

    // Log variable names found in template and the value Grafana uses for each
    const variableRefPattern = /\$(\w+)|(?:\$\{(\w+)(?::[^}]*)?\})/g;
    const variableNames = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = variableRefPattern.exec(template)) !== null) {
      variableNames.add(m[1] || m[2] || '');
    }
    variableNames.forEach((name) => {
      const valueUsed = getVariableValue(name);
      const scopedVal = name && (scoped[name] as { value?: unknown } | undefined);
      const varObj = variables.find((v) => v?.name === name);
      console.error(`[Druid] variable $${name} → value:`, valueUsed, '(from scopedVars:', !!scopedVal, ', from getVariables:', !!varObj, ')');
    });

    // Only for filter type = "json": replace "value":"$var" with properly JSON-escaped variable value so the template stays valid.
    // (templateSrv.replace would insert the raw value and break JSON when the value is an object/string with quotes.)
    // This pattern matches only filter objects with type "json" and a variable reference in value.
    const jsonFilterValueOnlyPattern = /"type"\s*:\s*"json"\s*,\s*"value"\s*:\s*"(\$[\w]+)"/g;
    template = template.replace(jsonFilterValueOnlyPattern, (_match, varRef: string) => {
      const varName = varRef.startsWith('$') ? varRef.slice(1) : varRef;
      const value = getVariableValue(varName);
      const str = value != null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
      const escaped = JSON.stringify(str).slice(1, -1);
      return '"type":"json","value":"' + escaped + '"';
    });

    const replaced = templateSrv.replace(template, scopedVars);
    console.error('[Druid] template after replace (snippet with first 2000 chars):', replaced.slice(0, 2000));

    let parsed = JSON.parse(replaced);
    if (parsed.builder) {
      parsed = { ...parsed, builder: expandJsonFiltersInBuilder(parsed.builder) };
    }
    // Backend uses expr to build the Druid query, so expr must contain the replaced and expanded payload.
    const result = { ...parsed, expr: JSON.stringify(parsed) };
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
