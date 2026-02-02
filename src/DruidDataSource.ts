import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';

const druidVariableRegex = /\"\[\[(\w+)(?::druid:(\w+))?\]\]\"|\"\${(\w+)(?::druid:(\w+))?}\"/g;

const REMOVE_FILTER_VALUE = '_REMOVE_FILTER_';

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

/**
 * Returns true if the filter should be removed (template "All" / no filter sentinel).
 * Matches: pattern === _REMOVE_FILTER_ (like/regex), value === _REMOVE_FILTER_ (selector/json), or values includes _REMOVE_FILTER_ (in).
 */
function shouldRemoveFilter(filter: any): boolean {
  if (filter == null || typeof filter !== 'object') return false;
  if (filter.pattern !== undefined && filter.pattern === REMOVE_FILTER_VALUE) return true;
  if (filter.value !== undefined && filter.value === REMOVE_FILTER_VALUE) return true;
  if (Array.isArray(filter.values) && filter.values.includes(REMOVE_FILTER_VALUE)) return true;
  return false;
}

/**
 * Recursively remove no-op filters (_REMOVE_FILTER_) from the filter tree.
 * When a variable means "All" or "no filter", Grafana can fill in _REMOVE_FILTER_; we strip those so only real filters are sent to Druid.
 */
function remove_filter_recursively(obj: any): any {
  if (obj == null) return obj;
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (obj.fields != null && Array.isArray(obj.fields)) {
      const fields = (obj.fields as any[]).map((f: any) => remove_filter_recursively(f)).filter((f: any) => !shouldRemoveFilter(f));
      if (fields.length === 0) return { type: 'true' };
      if (fields.length === 1) return fields[0];
      return { ...obj, fields };
    }
    if (obj.type === 'not' && obj.field != null) {
      const field = remove_filter_recursively(obj.field);
      return shouldRemoveFilter(field) ? { type: 'true' } : { ...obj, field };
    }
    if (shouldRemoveFilter(obj)) return { type: 'true' };
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = remove_filter_recursively(v);
    }
    return out;
  }
  if (Array.isArray(obj)) return obj.map((x) => remove_filter_recursively(x));
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
    const templateSrv = getTemplateSrv();
    // Use expr when present so variable replacement runs on the backend-ready payload (e.g. period granularity).
    // Otherwise we would use query.builder (UI state) and lose convertGranularityForBackend (granularity would become "day" again).
    let payload: Record<string, unknown>;
    if (templatedQuery.expr && typeof templatedQuery.expr === 'string') {
      try {
        payload = JSON.parse(templatedQuery.expr) as Record<string, unknown>;
      } catch {
        payload = { ...templatedQuery, expr: undefined };
      }
    } else {
      payload = { ...templatedQuery, expr: undefined };
    }
    let template = JSON.stringify(payload).replace(
      druidVariableRegex,
      (match, variable1, format1, variable2, format2) => {
        if (format1 || format2 === 'json') {
          return '${' + (variable1 || variable2) + ':doublequote}';
        }
        return match;
      }
    );

    const ts = templateSrv as { getVariables?: () => Array<{ name?: string; current?: { value?: unknown } }> };
    const variables = ts.getVariables?.() ?? [];
    const scoped = scopedVars ?? {};
    const getVariableValue = (name: string): unknown => {
      const scopedVal = name && (scoped[name] as { value?: unknown } | undefined);
      if (scopedVal?.value !== undefined) return scopedVal.value;
      const varObj = variables.find((v) => v?.name === name);
      return varObj?.current?.value;
    };

    // Only for filter type = "json": replace "value":"$var" with JSON-escaped variable value so the template stays valid.
    const jsonFilterValuePattern = /"type"\s*:\s*"json"\s*,\s*"value"\s*:\s*"(\$[\w]+)"/g;
    template = template.replace(jsonFilterValuePattern, (_match, varRef: string) => {
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
      let builder = expandJsonFiltersInBuilder(parsed.builder);
      builder = remove_filter_recursively(builder);
      parsed = { ...parsed, builder };
    }
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
