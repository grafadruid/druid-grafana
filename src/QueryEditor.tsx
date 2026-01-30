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

/**
 * Checks if an aggregation has all required fields and no empty required strings.
 * Incomplete aggregations (e.g. newly added empty row) must not be sent to Druid.
 */
const isAggregationComplete = (agg: any): boolean => {
  if (!agg || typeof agg !== 'object') {
    return false;
  }
  const type = agg.type;
  const name = agg.name;
  if (!type || typeof type !== 'string' || type.trim() === '') {
    return false;
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return false;
  }
  // Field-based aggregations (doubleSum, longSum, etc.) require fieldName
  if (agg.fieldName !== undefined && (!agg.fieldName || String(agg.fieldName).trim() === '')) {
    return false;
  }
  // Filtered aggregation requires filter and aggregator
  if (type === 'filtered') {
    if (!isFilterComplete(agg.filter)) {
      return false;
    }
    if (!isAggregationComplete(agg.aggregator)) {
      return false;
    }
  }
  return true;
};

/**
 * Checks if a filter is complete (has type and required fields; for and/or all sub-filters complete).
 */
const isFilterComplete = (filter: any): boolean => {
  if (filter === null || filter === undefined) {
    return true;
  }
  if (typeof filter !== 'object' || !filter.type || String(filter.type).trim() === '') {
    return false;
  }
  const type = filter.type;
  if (type === 'and' || type === 'or') {
    const fields = filter.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
      return false;
    }
    return fields.every((f: any) => isFilterComplete(f));
  }
  // Leaf filters: require no empty string for common required fields
  if (filter.dimension !== undefined && (!filter.dimension || String(filter.dimension).trim() === '')) {
    return false;
  }
  if (filter.value !== undefined && filter.value !== null && String(filter.value).trim() === '') {
    return false;
  }
  if (filter.fieldName !== undefined && (!filter.fieldName || String(filter.fieldName).trim() === '')) {
    return false;
  }
  return true;
};

/**
 * Checks if a post-aggregation is complete.
 */
const isPostAggregationComplete = (pa: any): boolean => {
  if (!pa || typeof pa !== 'object') {
    return false;
  }
  if (!pa.type || String(pa.type).trim() === '') {
    return false;
  }
  if (pa.name !== undefined && (!pa.name || String(pa.name).trim() === '')) {
    return false;
  }
  if (pa.type === 'arithmetic') {
    if (!pa.fn || !Array.isArray(pa.fields)) {
      return false;
    }
    return pa.fields.every((f: any) => isPostAggregationComplete(f));
  }
  if (pa.type === 'fieldAccess' || pa.type === 'finalizingFieldAccess') {
    return !!(pa.fieldName && String(pa.fieldName).trim());
  }
  return true;
};

/**
 * Returns a copy of the builder with only complete aggregations, filter, and post-aggregations.
 * When a new filter / aggregation / post-aggregation is added but incomplete, it is omitted
 * so Druid never receives partial config and errors. Post-aggregations are optional and may
 * not exist in every query.
 */
const sanitizeBuilderForBackend = (builder: any): any => {
  if (!builder || typeof builder !== 'object') {
    return builder;
  }
  const out = { ...builder };

  // Only send complete aggregations; omit newly added incomplete ones
  if (Array.isArray(out.aggregations)) {
    out.aggregations = out.aggregations.filter((agg: any) => isAggregationComplete(agg));
  }

  // Only send filter if complete; omit if newly added and incomplete
  if (out.filter !== undefined && out.filter !== null) {
    if (!isFilterComplete(out.filter)) {
      out.filter = null;
    }
  }

  // Post-aggregations are optional. Only send when present and include only complete ones.
  if (Array.isArray(out.postAggregations)) {
    const complete = out.postAggregations.filter((pa: any) => isPostAggregationComplete(pa));
    if (complete.length > 0) {
      out.postAggregations = complete;
    } else {
      delete out.postAggregations;
    }
  }

  return out;
};

/**
 * Validates if a query is complete enough to be executed.
 * Should be called on the sanitized builder so we only run when the payload we send is valid.
 */
const isQueryComplete = (builder: any): boolean => {
  if (!builder || typeof builder !== 'object') {
    return false;
  }

  const queryType = builder.queryType;
  if (!queryType || typeof queryType !== 'string') {
    return false;
  }

  // Check if dataSource exists and is valid
  const dataSource = builder.dataSource;
  if (!dataSource) {
    return false;
  }

  // dataSource can be a string or an object with a name property
  const tableName = typeof dataSource === 'string'
    ? dataSource
    : (dataSource.name || (dataSource.type === 'table' ? dataSource.name : null));

  if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
    return false;
  }

  // Query type-specific validation
  switch (queryType) {
    case 'timeseries':
      // Timeseries requires at least one aggregation
      const aggregations = builder.aggregations;
      if (!aggregations || !Array.isArray(aggregations) || aggregations.length === 0) {
        return false;
      }
      // Check that aggregations have at least one valid entry
      const validAggregations = aggregations.filter(
        (agg: any) => agg && typeof agg === 'object' && agg.type && agg.name
      );
      if (validAggregations.length === 0) {
        return false;
      }
      return true;

    case 'groupBy':
      // GroupBy requires at least one dimension and one aggregation
      const dimensions = builder.dimensions;
      const groupByAggregations = builder.aggregations;
      if (!dimensions || !Array.isArray(dimensions) || dimensions.length === 0) {
        return false;
      }
      if (!groupByAggregations || !Array.isArray(groupByAggregations) || groupByAggregations.length === 0) {
        return false;
      }
      return true;

    case 'topN':
      // TopN requires dimension, metric, threshold, and aggregations
      if (!builder.dimension || !builder.metric || builder.threshold === undefined) {
        return false;
      }
      const topNAggregations = builder.aggregations;
      if (!topNAggregations || !Array.isArray(topNAggregations) || topNAggregations.length === 0) {
        return false;
      }
      return true;

    case 'scan':
      // Scan queries are simpler - just need dataSource
      return true;

    case 'search':
      // Search requires query and searchDimensions
      if (!builder.query || !builder.searchDimensions) {
        return false;
      }
      return true;

    case 'sql':
      // SQL queries need the query string
      if (!builder.query || typeof builder.query !== 'string') {
        return false;
      }
      return true;

    default:
      // For unknown query types, be permissive but still require dataSource
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

  // Convert simple granularity (day/week/month) to period granularity with timezone for backend
  // Only applies to timeseries queries - other query types keep simple granularity as-is
  const convertGranularityForBackend = (builder: any, tz: string | undefined): any => {
    if (!builder || !builder.granularity || typeof builder.granularity !== 'string') {
      console.error('convertGranularityForBackend: early return - granularity is not a string');
      return builder;
    }

    // Only convert for timeseries queries
    if (builder.queryType !== 'timeseries') {
      return builder;
    }

    const granularityStr = builder.granularity;
    // Only convert day, week, and month granularities
    // Use case-insensitive matching to handle both "day" and "DAY" formats
    const periodMap: Record<string, string> = {
      day: 'P1D',
      week: 'P1W',
      month: 'P1M',
    };

    // Convert to lowercase for case-insensitive matching
    const granularityLower = granularityStr.toLowerCase();

    // Convert to period granularity if we have a timezone and it's day/week/month
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

    // Convert granularity for backend - need to convert in the builder that gets sent
    const converted = convertGranularityForBackend(
      queryBuilderOptions.builder,
      timezone && timezone !== 'browser' ? timezone : undefined
    );
    // Only send complete aggregations, filter, and post-aggregations to Druid (omit incomplete ones)
    const builderForBackend = sanitizeBuilderForBackend(converted);

    //workaround: https://github.com/grafana/grafana/issues/30013
    // Store original builder for UI, but use sanitized builder in expr for backend
    const expr = JSON.stringify({ ...queryBuilderOptions, builder: builderForBackend });
    // Keep original builder in query state for UI, but expr has sanitized builder for backend
    onChange({ ...query, ...queryBuilderOptions, expr: expr });

    // Only run query when the payload we send (sanitized) is complete
    const isComplete = isQueryComplete(builderForBackend);
    if (isComplete) {
      onRunQuery();
    }
  };
  const onSettingsOptionsChange = (querySettingsOptions: QuerySettingsOptions) => {
    const { query, onChange, onRunQuery } = props;

    // Convert granularity and sanitize so only complete aggregations/filter/post-aggregations are sent
    const converted = convertGranularityForBackend(
      query.builder,
      timezone && timezone !== 'browser' ? timezone : undefined
    );
    const builderForBackend = sanitizeBuilderForBackend(converted);

    //workaround: https://github.com/grafana/grafana/issues/30013
    // Use sanitized builder in expr for backend
    const expr = JSON.stringify({ builder: builderForBackend, ...querySettingsOptions });
    onChange({ ...query, ...querySettingsOptions, expr: expr });

    // Only run when the payload we send (sanitized) is complete
    if (isQueryComplete(builderForBackend)) {
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
      />
    </>
  );
};

const styles = {
  toolbar: css`
    margin-bottom: 4px;
  `,
};
