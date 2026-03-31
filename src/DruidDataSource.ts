import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { map } from 'rxjs/operators';
import { DruidSettings, DruidQuery } from './types';
import { ensureMetaqueriesCompatibleResponse } from './metaqueriesCompat';

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
  // value is a string that parses to a filter; remove if that filter tree contains _REMOVE_FILTER_ at top level
  if (typeof f['value'] === 'string') {
    try {
      const inner = JSON.parse(f['value'] as string) as Record<string, unknown>;
      if (inner != null && typeof inner === 'object' && typeof inner['type'] === 'string') {
        if (inner['value'] === REMOVE_FILTER_VALUE || inner['pattern'] === REMOVE_FILTER_VALUE) return true;
        const innerValues = inner['values'];
        if (Array.isArray(innerValues) && innerValues.includes(REMOVE_FILTER_VALUE)) return true;
      }
    } catch {
      // ignore
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

  // Any filter with a string value that parses to a nested filter tree: recurse into it and re-serialize
  const val = f['value'];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val) as Record<string, unknown>;
      if (parsed != null && typeof parsed === 'object' && typeof parsed['type'] === 'string') {
        const cleaned = removeFiltersMarkedForRemoval(parsed);
        if (cleaned == null || isFilterMarkedForRemoval(cleaned)) return null;
        return { ...f, value: JSON.stringify(cleaned) };
      }
    } catch {
      // not valid JSON or not a filter tree, fall through
    }
  }

  if (isFilterMarkedForRemoval(filter)) return null;
  return filter;
}

/**
 * By default we use options.range for the query interval. This updates expr and builder
 * so intervals always reflect the request range (dashboard or e.g. MetaQueries timeshift).
 */
function applyRequestRangeToQuery(
  target: { expr?: string; builder?: any; [key: string]: unknown },
  range?: { from: Date | string; to: Date | string }
): typeof target {
  if (range?.from == null || range?.to == null) return target;
  const fromISO =
    typeof range.from === 'string'
      ? range.from
      : typeof (range.from as Date).toISOString === 'function'
        ? (range.from as Date).toISOString()
        : new Date(range.from as string).toISOString();
  const toISO =
    typeof range.to === 'string'
      ? range.to
      : typeof (range.to as Date).toISOString === 'function'
        ? (range.to as Date).toISOString()
        : new Date(range.to as string).toISOString();
  const intervalStr = `${fromISO}/${toISO}`;
  const intervalsPayload = { type: 'intervals' as const, intervals: [intervalStr] };

  let expr = target.expr;
  if (expr && typeof expr === 'string' && expr.trim() !== '') {
    try {
      const payload = JSON.parse(expr) as { builder?: { intervals?: unknown }; settings?: unknown };
      if (payload.builder) {
        payload.builder.intervals = intervalsPayload;
        expr = JSON.stringify(payload);
      }
    } catch {
      // leave expr unchanged if parse fails
    }
  }

  const builder =
    target.builder && typeof target.builder === 'object'
      ? { ...target.builder, intervals: intervalsPayload }
      : target.builder;

  return { ...target, expr: expr ?? target.expr, builder };
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

  /**
   * Override query so the response shape is compatible with the grafana-meta-queries plugin:
   * result.data (not only result.frames), each series with target/name and datapoints (and
   * fields with Vector-like .values.get(i) for the DataFrame path).
   *
   * When metaqueries is the parent and has multiple child datasources (e.g. grafana-druid +
   * metaqueries for timeshift), it calls this datasource multiple times with the same requestId.
   * Grafana cancels the first in-flight request when a second with the same requestId is sent.
   * We give each call a unique requestId so simultaneous requests are not cancelled.
   */
  query(options: any) {
    const uniqueRequestId =
      (options?.requestId ?? 'query') + '-' + Math.random().toString(36).slice(2, 11);
    // By default use options.range for the interval; bake it into expr/builder before sending.
    const targetsWithRange =
      options?.targets?.map((t: any) => applyRequestRangeToQuery(t, options.range)) ?? options?.targets;
    const uniqueOptions = {
      ...options,
      requestId: uniqueRequestId,
      targets: targetsWithRange,
    };
    return super.query(uniqueOptions).pipe(
      map((response: { data?: unknown[]; frames?: unknown[]; [key: string]: unknown }) => {
        //console.error('[Druid] query: response received from backend (before metaqueries compat)', response); //uncomment to debug
        const out = ensureMetaqueriesCompatibleResponse(response);
        //console.error('[Druid] query: output sent to Grafana / metaqueries (after metaqueries compat)', out); //uncomment to debug
        return out;
      })
    );
  }
  applyTemplateVariables(templatedQuery: DruidQuery, scopedVars?: ScopedVars) {
    // console.error('[Druid] applyTemplateVariables received from Grafana:', { templatedQuery, scopedVars, }); //uncomment to debug

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
    // console.error('[Druid][payload] applyTemplateVariables before full replacement:', { payload }); //uncomment to debug
    if (payload.builder?.filter != null) {
      replaceFilterTreeTemplateValues(payload.builder.filter, scopedVars, templateSrv);
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
    // Remove filters marked with _REMOVE_FILTER_ once after variable substitution is done.
    if (substitutedPayload.builder?.filter != null) {
      const filterAfterRemoval = removeFiltersMarkedForRemoval(substitutedPayload.builder.filter);
      substitutedPayload.builder.filter = filterAfterRemoval ?? undefined;
    }
    // Preserve query metadata (refId, datasource, hide, etc.) so Grafana can match the response to the panel.
    const result = {
      ...templatedQuery,
      ...substitutedPayload,
      expr:
        templatedQuery.expr && templatedQuery.expr.trim() !== ''
          ? JSON.stringify({ builder: substitutedPayload.builder, settings: substitutedPayload.settings })
          : templatedQuery.expr,
    };
    console.error('[Druid] applyTemplateVariables sending (after variable replacement):', result); //uncomment to debug
    return result;
  }

  // grafana calls applyTemplateVariables directly on the backend datasource, so this method is never called.
  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query)).then((response) => {
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
