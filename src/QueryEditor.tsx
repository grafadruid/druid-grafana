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
 * Validates if a query is complete enough to be executed.
 * Returns true if the query has all required fields, false otherwise.
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
    const builderForBackend = convertGranularityForBackend(
      queryBuilderOptions.builder,
      timezone && timezone !== 'browser' ? timezone : undefined
    );

    // Log topN and search queries before sending to Druid
    if (builderForBackend?.queryType === 'topN') {
      console.error('=== TOPN QUERY JSON SENT TO DRUID ===');
      console.error(JSON.stringify(builderForBackend, null, 2));
      console.error('=====================================');
    } else if (builderForBackend?.queryType === 'search') {
      console.error('=== SEARCH QUERY JSON SENT TO DRUID ===');
      console.error(JSON.stringify(builderForBackend, null, 2));
      console.error('=======================================');
    }

    //workaround: https://github.com/grafana/grafana/issues/30013
    // Store original builder for UI, but use converted builder in expr for backend
    const expr = JSON.stringify({ ...queryBuilderOptions, builder: builderForBackend });
    // Keep original builder in query state for UI, but expr has converted builder for backend
    onChange({ ...query, ...queryBuilderOptions, expr: expr });

    // Only run query if it's complete enough to execute (use original builder for validation)
    const isComplete = isQueryComplete(queryBuilderOptions.builder);
    if (isComplete) {
      onRunQuery();
    }
  };
  const onSettingsOptionsChange = (querySettingsOptions: QuerySettingsOptions) => {
    const { query, onChange, onRunQuery } = props;

    // Convert granularity for backend
    const builderForBackend = convertGranularityForBackend(
      query.builder,
      timezone && timezone !== 'browser' ? timezone : undefined
    );

    // Log topN and search queries before sending to Druid
    if (builderForBackend?.queryType === 'topN') {
      console.error('=== TOPN QUERY JSON SENT TO DRUID (from settings change) ===');
      console.error(JSON.stringify(builderForBackend, null, 2));
      console.error('=============================================================');
    } else if (builderForBackend?.queryType === 'search') {
      console.error('=== SEARCH QUERY JSON SENT TO DRUID (from settings change) ===');
      console.error(JSON.stringify(builderForBackend, null, 2));
      console.error('===============================================================');
    }

    //workaround: https://github.com/grafana/grafana/issues/30013
    // Use converted builder in expr for backend
    const expr = JSON.stringify({ builder: builderForBackend, ...querySettingsOptions });
    onChange({ ...query, ...querySettingsOptions, expr: expr });

    // Only run query if it's complete enough to execute (use original builder for validation)
    if (isQueryComplete(query.builder)) {
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
