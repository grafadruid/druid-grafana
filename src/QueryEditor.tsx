import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ToolbarButtonRow, ToolbarButton, Drawer } from '@grafana/ui';
import { QueryEditorProps, getTimeZone } from '@grafana/data';
import { css, cx } from '@emotion/css';
import { DruidDataSource } from './DruidDataSource';
import { DruidSettings, DruidQuery } from './types';
import { normalizeData } from './configuration/settings';
import { DruidQuerySettings } from './configuration/QuerySettings';
import { QuerySettingsOptions } from './configuration/QuerySettings/types';
import { DruidQueryBuilder } from './builder/';
import { QueryBuilderOptions } from './builder/types';

interface Props extends QueryEditorProps<DruidDataSource, DruidQuery, DruidSettings> {}

/** Returns true if a value is empty (null, undefined, or blank string/array). */
const isEmpty = (v: any): boolean => {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return String(v).trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
};

/**
 * Checks if a filter is complete (used for filtered aggregation and for main query filter).
 * Any filter with required fields that are null/empty is incomplete and must not be sent to Druid.
 */
const isFilterComplete = (filter: any): boolean => {
  if (filter === null || filter === undefined) {
    return true;
  }
  if (typeof filter !== 'object' || !filter.type || String(filter.type).trim() === '') {
    return false;
  }
  if (filter.type === 'and' || filter.type === 'or') {
    const fields = filter.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
      return false;
    }
    return fields.every((f: any) => isFilterComplete(f));
  }
  if (filter.type === 'not') {
    return filter.field != null && isFilterComplete(filter.field);
  }
  if (filter.dimension !== undefined && isEmpty(filter.dimension)) {
    return false;
  }
  switch (filter.type) {
    case 'selector':
      return !isEmpty(filter.value);
    case 'like':
    case 'regex':
      return !isEmpty(filter.pattern);
    case 'in':
      return Array.isArray(filter.values) && filter.values.length > 0;
    case 'bound':
      return !isEmpty(filter.lower) || !isEmpty(filter.upper);
    case 'expression':
      return !isEmpty(filter.expression);
    case 'interval':
      return !isEmpty(filter.intervals);
    case 'javascript':
      return !isEmpty(filter.function);
    case 'json':
      return !isEmpty(filter.value);
    case 'columnComparison':
      return Array.isArray(filter.dimensions) && filter.dimensions.length > 0;
    case 'true':
    case 'false':
      return true;
    default:
      if (filter.value !== undefined && isEmpty(filter.value)) return false;
      if (filter.pattern !== undefined && isEmpty(filter.pattern)) return false;
      if (filter.values !== undefined && isEmpty(filter.values)) return false;
      return true;
  }
};

const AGGREGATION_TYPES_WITH_EXPRESSION = new Set([
  'longSum', 'longMin', 'longMax', 'doubleSum', 'doubleMin', 'doubleMax',
  'floatSum', 'floatMin', 'floatMax',
]);

const isAggregationComplete = (agg: any): boolean => {
  if (!agg || typeof agg !== 'object') return false;
  const type = agg.type;
  if (!type || typeof type !== 'string' || type.trim() === '') return false;
  const name = agg.name;
  if (!name || typeof name !== 'string' || name.trim() === '') return false;
  if (type !== 'count' && type !== 'filtered') {
    const fn = agg.fieldName;
    const hasFieldName = fn !== undefined && fn !== null && typeof fn === 'string' && fn.trim() !== '';
    if (AGGREGATION_TYPES_WITH_EXPRESSION.has(type)) {
      const expr = agg.expression;
      const hasExpression = expr !== undefined && expr !== null && typeof expr === 'string' && expr.trim() !== '';
      if (!hasFieldName && !hasExpression) return false;
    } else {
      if (!hasFieldName) return false;
    }
  }
  if (type === 'filtered') {
    if (!isFilterComplete(agg.filter)) return false;
    if (!isAggregationComplete(agg.aggregator)) return false;
  }
  return true;
};

const sanitizeAggregationsForBackend = (builder: any): any => {
  if (!builder || typeof builder !== 'object' || !Array.isArray(builder.aggregations)) return builder;
  const complete = builder.aggregations.filter((agg: any) => isAggregationComplete(agg));
  if (complete.length === builder.aggregations.length) return builder;
  return { ...builder, aggregations: complete };
};

/**
 * Removes empty optional fields from aggregations so Druid is not sent invalid payload.
 */
const stripEmptyAggregationFields = (builder: any): any => {
  if (!builder || typeof builder !== 'object' || !Array.isArray(builder.aggregations)) return builder;
  const cleanAgg = (agg: any): any => {
    if (!agg || typeof agg !== 'object') return agg;
    const out = { ...agg };
    if (out.expression === '' || out.expression === undefined || out.expression === null) delete out.expression;
    if (out.fieldName === '' || out.fieldName === undefined || out.fieldName === null) delete out.fieldName;
    if (agg.type === 'filtered' && agg.aggregator) out.aggregator = cleanAgg(agg.aggregator);
    return out;
  };
  return { ...builder, aggregations: builder.aggregations.map(cleanAgg) };
};

const sanitizeFilterForBackend = (builder: any): any => {
  if (!builder || typeof builder !== 'object' || !builder.filter) return builder;
  const filter = builder.filter;
  if (filter.type === 'and' && Array.isArray(filter.fields)) {
    const validFields = filter.fields.filter((f: any) => isFilterComplete(f));
    if (validFields.length === filter.fields.length) return builder;
    if (validFields.length === 0) { const { filter: _f, ...rest } = builder; return rest; }
    if (validFields.length === 1) return { ...builder, filter: validFields[0] };
    return { ...builder, filter: { type: 'and', fields: validFields } };
  }
  if (filter.type === 'or' && Array.isArray(filter.fields)) {
    const validFields = filter.fields.filter((f: any) => isFilterComplete(f));
    if (validFields.length === filter.fields.length) return builder;
    if (validFields.length === 0) { const { filter: _f, ...rest } = builder; return rest; }
    if (validFields.length === 1) return { ...builder, filter: validFields[0] };
    return { ...builder, filter: { type: 'or', fields: validFields } };
  }
  if (!isFilterComplete(filter)) { const { filter: _f, ...rest } = builder; return rest; }
  return builder;
};

const isQueryComplete = (builder: any): boolean => {
  if (!builder || typeof builder !== 'object') return false;
  const queryType = builder.queryType;
  if (!queryType || typeof queryType !== 'string') return false;
  const dataSource = builder.dataSource;
  if (!dataSource) return false;
  const tableName = typeof dataSource === 'string'
    ? dataSource
    : (dataSource.name || (dataSource.type === 'table' ? dataSource.name : null));
  if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') return false;
  switch (queryType) {
    case 'timeseries': {
      const aggregations = builder.aggregations;
      if (!aggregations || !Array.isArray(aggregations) || aggregations.length === 0) return false;
      if (aggregations.filter((agg: any) => isAggregationComplete(agg)).length === 0) return false;
      return true;
    }
    case 'groupBy': {
      const dimensions = builder.dimensions;
      const groupByAggregations = builder.aggregations;
      if (!dimensions || !Array.isArray(dimensions) || dimensions.length === 0) return false;
      if (!groupByAggregations || !Array.isArray(groupByAggregations) || groupByAggregations.length === 0) return false;
      if (groupByAggregations.filter((agg: any) => isAggregationComplete(agg)).length === 0) return false;
      return true;
    }
    case 'topN':
      if (!builder.dimension || !builder.metric || builder.threshold === undefined) return false;
      const topNAggregations = builder.aggregations;
      if (!topNAggregations || !Array.isArray(topNAggregations) || topNAggregations.length === 0) return false;
      if (topNAggregations.filter((agg: any) => isAggregationComplete(agg)).length === 0) return false;
      return true;
    case 'scan':
      return true;
    case 'search':
      return !!(builder.query && builder.searchDimensions);
    case 'sql':
      return !!(builder.query && typeof builder.query === 'string');
    default:
      return true;
  }
};

export const QueryEditor = (props: Props) => {
  const { builder, settings } = props.query;

  // Get timezone from Grafana dashboard
  const timezone = useMemo(() => {
    const tz = getTimeZone(props.data);
    return tz;
  }, [props.data]);

  // Initialize default builder if empty or missing required fields
  const defaultBuilder = useMemo(() => {
    if (!builder || Object.keys(builder).length === 0) {
      return {
        queryType: 'timeseries',
        dataSource: {
          type: 'table',
          name: 'raw_events',
        },
        granularity: 'hour',
      };
    }
    // Ensure queryType is set to timeseries if not set
    if (!builder.queryType) {
      return { ...builder, queryType: 'timeseries' };
    }
    // Ensure dataSource is set to table type if not set
    if (!builder.dataSource) {
      return {
        ...builder,
        dataSource: {
          type: 'table',
          name: 'raw_events',
        },
      };
    }
    return builder;
  }, [builder]);

  // Track if we've initialized defaults to avoid infinite loops
  const hasInitializedDefaults = useRef(false);

  const lastRunPayloadRef = useRef<string | null>(null);

  // Persist defaults when they're first set (only if builder is empty or missing required fields)
  useEffect(() => {
    const needsDefaults = !builder ||
      Object.keys(builder).length === 0 ||
      !builder.queryType ||
      !builder.dataSource;

    if (needsDefaults && !hasInitializedDefaults.current && defaultBuilder.queryType === 'timeseries' && defaultBuilder.dataSource?.type === 'table') {
      const { onChange } = props;
      hasInitializedDefaults.current = true;
      onChange({
        ...props.query,
        builder: defaultBuilder,
      });
    }
  }, [builder, defaultBuilder, props]);

  const builderOptions = { builder: defaultBuilder, settings: settings || {} };
  const datasourceQuerySettings = normalizeData(props.datasource.settingsData, false, 'query');
  /*TODO merging settings that way is not good: things like query context won't get merged
  the query settings context will replace the datasource query settings context instead of merging
  backend side of the plugin does already merge them properly: we need to move the (proper) merging from backend to frontend*/
  const settingsOptions = { settings: {...datasourceQuerySettings, ...settings} };

  // Query types that do not have a granularity field (no conversion applied)
  const QUERY_TYPES_WITHOUT_GRANULARITY = ['segmentMetadata', 'scan'];

  // Convert simple granularity (day/week/month/quarter/year) to period granularity with timezone for backend.
  // Applies to all query types that use granularity (timeseries, groupBy, topN, search, etc.) so Druid buckets in the given timezone (e.g. PST).
  const convertGranularityForBackend = (builder: any, tz: string | undefined): any => {
    if (!builder) {
      return builder;
    }

    // Skip conversion for query types that don't use granularity
    const queryType = builder.queryType && String(builder.queryType).toLowerCase();
    if (queryType && QUERY_TYPES_WITHOUT_GRANULARITY.indexOf(queryType) !== -1) {
      return builder;
    }

    if (!builder.granularity || typeof builder.granularity !== 'string') {
      return builder;
    }

    const granularityStr = builder.granularity;
    // Convert day, week, month, quarter, year to period with timezone
    // Use case-insensitive matching to handle both "day" and "DAY" formats
    const periodMap: Record<string, string> = {
      day: 'P1D',
      week: 'P1W',
      month: 'P1M',
      quarter: 'P3M',
      year: 'P1Y',
    };

    const granularityLower = granularityStr.toLowerCase();

    if (tz && tz !== 'browser' && periodMap[granularityLower]) {
      const periodGranularity: any = {
        type: 'period',
        period: periodMap[granularityLower],
        timeZone: tz,
      };
      return { ...builder, granularity: periodGranularity };
    }

    return builder;
  };

  const onBuilderOptionsChange = (queryBuilderOptions: QueryBuilderOptions) => {
    const { query, onChange, onRunQuery } = props;
    //todo: need to implement some kind of hook system to alter a query from modules

    // Ensure defaults are set if missing
    if (queryBuilderOptions.builder !== null) {
      if (!queryBuilderOptions.builder.queryType) {
        queryBuilderOptions.builder.queryType = 'timeseries';
      }
      if (!queryBuilderOptions.builder.dataSource) {
        queryBuilderOptions.builder.dataSource = {
          type: 'table',
          name: 'raw_events',
        };
      }

      // Auto-populate intervals from Grafana timerange if missing
      if (
        queryBuilderOptions.builder.intervals === undefined ||
        (Array.isArray(queryBuilderOptions.builder.intervals.intervals) &&
          queryBuilderOptions.builder.intervals.intervals.length === 0)
      ) {
        queryBuilderOptions.builder.intervals = {
          type: 'intervals',
          intervals: ['${__from:date:iso}/${__to:date:iso}'],
        };
      }
    }

    const converted = convertGranularityForBackend(
      queryBuilderOptions.builder,
      timezone && timezone !== 'browser' ? timezone : undefined
    );
    const builderForBackend = sanitizeFilterForBackend(
      stripEmptyAggregationFields(sanitizeAggregationsForBackend(converted))
    );

    //workaround: https://github.com/grafana/grafana/issues/30013
    const expr = JSON.stringify({ ...queryBuilderOptions, builder: builderForBackend });
    onChange({ ...query, ...queryBuilderOptions, expr: expr });

    const filterComplete = !queryBuilderOptions.builder?.filter || isFilterComplete(queryBuilderOptions.builder.filter);
    const isComplete = isQueryComplete(builderForBackend);
    const payloadStr = JSON.stringify(builderForBackend);
    if (filterComplete && isComplete && payloadStr !== lastRunPayloadRef.current) {
      lastRunPayloadRef.current = payloadStr;
      onRunQuery();
    }
  };
  const onSettingsOptionsChange = (querySettingsOptions: QuerySettingsOptions) => {
    const { query, onChange, onRunQuery } = props;

    const converted = convertGranularityForBackend(
      query.builder,
      timezone && timezone !== 'browser' ? timezone : undefined
    );
    const builderForBackend = sanitizeFilterForBackend(
      stripEmptyAggregationFields(sanitizeAggregationsForBackend(converted))
    );

    //workaround: https://github.com/grafana/grafana/issues/30013
    const expr = JSON.stringify({ builder: builderForBackend, ...querySettingsOptions });
    onChange({ ...query, ...querySettingsOptions, expr: expr });

    const filterComplete = !query.builder?.filter || isFilterComplete(query.builder.filter);
    const payloadStr = JSON.stringify(builderForBackend);
    if (filterComplete && isQueryComplete(builderForBackend) && payloadStr !== lastRunPayloadRef.current) {
      lastRunPayloadRef.current = payloadStr;
      onRunQuery();
    }
  };
  const [showDrawer, setShowDrawer] = useState(false);
  return (
    <>
      <ToolbarButtonRow className={cx(styles.toolbar)}>
        <ToolbarButton
          icon="cog"
          onClick={(event) => {
            setShowDrawer(true);
            event.preventDefault();
          }}
        >
          Query settings
        </ToolbarButton>
      </ToolbarButtonRow>
      {showDrawer && (
        <Drawer
          title="Settings"
          subtitle="The settings to attach to the query. Those settings will be merged with the ones defined at datasource level."
          closeOnMaskClick={true}
          scrollableContent={true}
          size="md"
          onClose={() => {
            setShowDrawer(false);
          }}
        >
          <DruidQuerySettings options={settingsOptions} onOptionsChange={onSettingsOptionsChange} />
        </Drawer>
      )}
      <DruidQueryBuilder
        options={builderOptions}
        onOptionsChange={onBuilderOptionsChange}
        datasource={props.datasource}
        rootBuilder={builderOptions.builder}
        range={props.range}
      />
    </>
  );
};

const styles = {
  toolbar: css`
    margin-bottom: 4px;
  `,
};
