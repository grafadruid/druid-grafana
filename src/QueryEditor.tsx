import React, { useState, useMemo } from 'react';
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
  
  // Get timezone from Grafana dashboard/user settings
  const timezone = useMemo(() => {
    return getTimeZone(props.data);
  }, [props.data]);
  
  // Automatically add timezone to settings if not already set
  const settingsWithTimezone = useMemo(() => {
    const mergedSettings = { ...settings };
    // Only add timezone if it's not already set and we have a valid timezone
    if (!mergedSettings.timezone && timezone && timezone !== 'browser') {
      mergedSettings.timezone = timezone;
    }
    return mergedSettings;
  }, [settings, timezone]);
  
  const builderOptions = { builder: builder || {}, settings: settingsWithTimezone || {} };
  const datasourceQuerySettings = normalizeData(props.datasource.settingsData, false, 'query');
  /*TODO merging settings that way is not good: things like query context won't get merged
  the query settings context will replace the datasource query settings context instead of merging
  backend side of the plugin does already merge them properly: we need to move the (proper) merging from backend to frontend*/
  const settingsOptions = { settings: {...datasourceQuerySettings, ...settingsWithTimezone} };
  // Convert simple granularity to period granularity with timezone if needed (only for backend)
  const convertSimpleGranularityForBackend = (builder: any, tz: string | undefined): any => {
    if (!builder || !builder.granularity || typeof builder.granularity !== 'string') {
      return builder;
    }
    
    const granularityStr = builder.granularity;
    const periodMap: Record<string, string> = {
      second: 'PT1S',
      minute: 'PT1M',
      fifteen_minute: 'PT15M',
      thirty_minute: 'PT30M',
      hour: 'PT1H',
      day: 'P1D',
      week: 'P1W',
      month: 'P1M',
      quarter: 'P3M',
      year: 'P1Y',
    };
    
    // If it's "all" or "none", keep as string
    if (granularityStr === 'all' || granularityStr === 'none') {
      return builder;
    }
    
    // Convert to period granularity if we have a timezone and it's a timezone-aware granularity
    if (tz && tz !== 'browser' && periodMap[granularityStr]) {
      const periodGranularity: any = {
        type: 'period',
        period: periodMap[granularityStr],
        timeZone: tz,
      };
      return { ...builder, granularity: periodGranularity };
    }
    
    return builder;
  };

  const onBuilderOptionsChange = (queryBuilderOptions: QueryBuilderOptions) => {
    const { query, onChange, onRunQuery } = props;
    //todo: need to implement some kind of hook system to alter a query from modules
    if (
      queryBuilderOptions.builder !== null &&
      (queryBuilderOptions.builder.intervals === undefined ||
        (Array.isArray(queryBuilderOptions.builder.intervals.intervals) &&
          queryBuilderOptions.builder.intervals.intervals.length === 0))
    ) {
      queryBuilderOptions.builder.intervals = {
        type: 'intervals',
        intervals: ['${__from:date:iso}/${__to:date:iso}'],
      };
    }
    
    // Ensure timezone is included in settings
    const settingsWithTz = {
      ...queryBuilderOptions.settings,
      timezone: queryBuilderOptions.settings?.timezone || (timezone && timezone !== 'browser' ? timezone : undefined),
    };
    
    // Convert granularity only for the backend (in expr), keep UI state unchanged
    const builderForBackend = convertSimpleGranularityForBackend(
      queryBuilderOptions.builder,
      timezone && timezone !== 'browser' ? timezone : undefined
    );
    
    //workaround: https://github.com/grafana/grafana/issues/30013
    // Use converted builder only in expr (for backend), but keep original in query state (for UI)
    const expr = JSON.stringify({ ...queryBuilderOptions, builder: builderForBackend, settings: settingsWithTz });
    onChange({ ...query, ...queryBuilderOptions, settings: settingsWithTz, expr: expr });
    
    // Only run query if it's complete enough to execute (use original builder for validation)
    if (isQueryComplete(queryBuilderOptions.builder)) {
      onRunQuery();
    }
  };
  const onSettingsOptionsChange = (querySettingsOptions: QuerySettingsOptions) => {
    const { query, onChange, onRunQuery } = props;
    // Ensure timezone is included in settings if not explicitly set
    const settingsWithTz = {
      ...querySettingsOptions.settings,
      timezone: querySettingsOptions.settings?.timezone || (timezone && timezone !== 'browser' ? timezone : undefined),
    };
    
    // Convert granularity only for the backend (in expr), keep UI state unchanged
    const builderForBackend = convertSimpleGranularityForBackend(
      query.builder,
      timezone && timezone !== 'browser' ? timezone : undefined
    );
    
    //workaround: https://github.com/grafana/grafana/issues/30013
    // Use converted builder only in expr (for backend), but keep original in query state (for UI)
    const expr = JSON.stringify({ builder: builderForBackend, settings: settingsWithTz });
    onChange({ ...query, settings: settingsWithTz, expr: expr });
    
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
