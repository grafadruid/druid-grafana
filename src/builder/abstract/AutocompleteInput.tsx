import React, { useMemo, useState } from 'react';
import { InlineField, AsyncSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderFieldProps } from './types';
import { onBuilderChange } from '.';
import { DruidDataSource } from '../../DruidDataSource';

interface Props extends QueryBuilderFieldProps {
  type: 'dimension' | 'dimensionValue' | 'metric' | 'table';
  datasource?: DruidDataSource;
  debounceTime?: number;
  dimensionName?: string | null;
}

const getTableName = (builder: any): string | null => {
  if (!builder) return null;

  // Check for dataSource in query builder
  if (builder.dataSource) {
    if (typeof builder.dataSource === 'string') {
      return builder.dataSource;
    }
    if (builder.dataSource.name) {
      return builder.dataSource.name;
    }
    if (builder.dataSource.type === 'table' && builder.dataSource.name) {
      return builder.dataSource.name;
    }
  }

  return null;
};

const fetchDimensionNames = async (
  datasource: DruidDataSource,
  tableName: string | null,
  inputValue: string
): Promise<SelectableValue[]> => {
  if (!tableName) {
    return [];
  }

  try {
    // Use Druid metadata API to get dimensions
    const metadata = await datasource.getDatasourceMetadata(tableName);

    if (!metadata || !metadata.dimensions) {
      console.debug('No dimensions found in metadata or metadata not available');
      return [];
    }

    // Extract dimension names from metadata
    const dimensions = Array.isArray(metadata.dimensions)
      ? metadata.dimensions
      : [];

    // Filter by input value (substring match) and sort
    const filtered = dimensions
      .filter((dim: string) => typeof dim === 'string' && dim.trim() !== '')
      .filter((dim: string) => !inputValue || dim.toLowerCase().includes(inputValue.toLowerCase()))
      .map((dim: string) => ({
        value: dim,
        label: dim,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 10); // Limit to 10 results

    return filtered;
  } catch (error) {
    console.error('Error fetching dimension names from metadata API:', error);
    return [];
  }
};

const fetchMetrics = async (
  datasource: DruidDataSource,
  tableName: string | null,
  inputValue: string
): Promise<SelectableValue[]> => {
  if (!tableName) {
    return [];
  }

  try {
    // Use Druid metadata API to get metrics
    const metadata = await datasource.getDatasourceMetadata(tableName);

    if (!metadata || !metadata.metrics) {
      console.debug('No metrics found in metadata or metadata not available');
      return [];
    }

    // Extract metric names from metadata
    const metrics = Array.isArray(metadata.metrics)
      ? metadata.metrics
      : [];

    // Filter by input value (substring match) and sort
    const filtered = metrics
      .filter((metric: string) => typeof metric === 'string' && metric.trim() !== '')
      .filter((metric: string) => !inputValue || metric.toLowerCase().includes(inputValue.toLowerCase()))
      .map((metric: string) => ({
        value: metric,
        label: metric,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 10); // Limit to 10 results

    return filtered;
  } catch (error) {
    console.error('Error fetching metrics from metadata API:', error);
    return [];
  }
};

const fetchTableNames = async (
  datasource: DruidDataSource,
  inputValue: string
): Promise<SelectableValue[]> => {
  try {
    // Use Druid metadata API to get all datasource names
    const datasources = await datasource.listDatasources();

    if (!datasources || !Array.isArray(datasources)) {
      console.debug('No datasources found or invalid response');
      return [];
    }

    // Filter by input value (substring match) and sort
    const filtered = datasources
      .filter((name: string) => typeof name === 'string' && name.trim() !== '')
      .filter((name: string) => !inputValue || name.toLowerCase().includes(inputValue.toLowerCase()))
      .map((name: string) => ({
        value: name,
        label: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 50); // Limit to 50 results (more than dimensions/metrics since there are usually fewer tables)

    return filtered;
  } catch (error) {
    console.error('Error fetching table names from metadata API:', error);
    return [];
  }
};

const fetchDimensionValues = async (
  datasource: DruidDataSource,
  tableName: string | null,
  dimensionName: string | null,
  inputValue: string,
  rootBuilder: any = null
): Promise<SelectableValue[]> => {
  if (!tableName || !dimensionName) {
    console.debug('fetchDimensionValues: Missing tableName or dimensionName', { tableName, dimensionName });
    return [];
  }

  try {
    // Use Druid topN query to get dimension values
    // This is similar to the SQL approach but uses native Druid queries
    // Get intervals - handle both object format { type: 'intervals', intervals: [...] } and array format
    let intervals: string[] = ['${__from:date:iso}/${__to:date:iso}'];
    if (rootBuilder?.intervals) {
      if (Array.isArray(rootBuilder.intervals)) {
        intervals = rootBuilder.intervals;
      } else if (rootBuilder.intervals.intervals && Array.isArray(rootBuilder.intervals.intervals)) {
        intervals = rootBuilder.intervals.intervals;
      }
    }
    console.error('fetchDimensionValues - Intervals:', intervals);
    console.error('fetchDimensionValues - Root builder intervals:', rootBuilder?.intervals);

    const topNQuery: any = {
      queryType: 'topN',
      dataSource: tableName,
      granularity: 'all',
      threshold: 10,
      dimension: dimensionName,
      metric: 'count',
      aggregations: [{ type: 'count', name: 'count' }],
      intervals: intervals,
    };
    console.error('fetchDimensionValues - Initial topN query:', JSON.stringify(topNQuery, null, 2));

    // Build filters array - start with existing filters from root builder if any
    const filters: any[] = [];
    if (rootBuilder?.filter) {
      // Deep copy the existing filter to avoid mutating the original
      const existingFilter = JSON.parse(JSON.stringify(rootBuilder.filter));
      filters.push(existingFilter);
      console.error('fetchDimensionValues - Existing filter from root builder:', JSON.stringify(existingFilter, null, 2));
    }

    // Add search filter if there's an input value
    if (inputValue && inputValue.trim() !== '') {
      const searchFilter = {
        type: 'search',
        dimension: dimensionName,
        query: {
          type: 'contains',
          value: inputValue,
          case_sensitive: false,
        },
      };
      filters.push(searchFilter);
      console.error('fetchDimensionValues - Search filter added:', JSON.stringify(searchFilter, null, 2));
    }

    console.error('fetchDimensionValues - All filters array:', JSON.stringify(filters, null, 2));

    // Build filter tree - if we have multiple filters, wrap them in an "and" filter
    if (filters.length > 0) {
      if (filters.length === 1) {
        topNQuery.filter = filters[0];
      } else {
        topNQuery.filter = {
          type: 'and',
          fields: filters,
        };
      }
      console.error('fetchDimensionValues - Final filter in topN query:', JSON.stringify(topNQuery.filter, null, 2));
    }

    console.error('fetchDimensionValues - Complete topN query:', JSON.stringify(topNQuery, null, 2));

    const query = {
      builder: topNQuery,
      settings: {},
    };

    console.error('fetchDimensionValues - Query being sent to query-variable:', JSON.stringify(query, null, 2));

    const response = await datasource.postResource('query-variable', query);

    console.error('fetchDimensionValues - Response received:', response);

    // The response from query-variable returns MetricFindValue format
    // Extract unique values from topN results
    const values = new Set<string>();

    if (Array.isArray(response) && response.length > 0) {
      response.forEach((item: any) => {
        // Try both value and text fields
        const value = item.value !== undefined && item.value !== null ? item.value : (item.text !== undefined && item.text !== null ? item.text : null);
        if (value !== null && value !== undefined) {
          const strValue = String(value);
          if (strValue.trim() !== '') {
            values.add(strValue);
          }
        }
      });
    }

    // Return results (already filtered and sorted by topN)
    if (values.size > 0) {
      return Array.from(values)
        .map((val) => ({
          value: val,
          label: val,
        }))
        .slice(0, 10); // Limit to 10 results for display
    }

    return [];
  } catch (error) {
    console.error('Error fetching dimension values:', error);
    console.error('Query details:', { tableName, dimensionName, inputValue });
    console.error('Root builder:', rootBuilder);
    if (error && typeof error === 'object' && 'data' in error) {
      console.error('Error data:', error.data);
      console.error('Error status:', (error as any).status);
      console.error('Error statusText:', (error as any).statusText);
    }
    return [];
  }
};

export const AutocompleteInput = (props: Props) => {
  const { datasource, type, debounceTime = 300 } = props;
  const [isLoading, setIsLoading] = useState(false);

  // Get table name from the query builder
  const tableName = useMemo(() => {
    // Try to get from root builder first, then fall back to current builder
    const rootBuilder = (props as any).rootBuilder || props.options.builder;
    return getTableName(rootBuilder);
  }, [props.options.builder, (props as any).rootBuilder]);

  // For dimension values, we need the dimension name
  // It can be passed as a prop or found in the parent builder context
  const dimensionName = useMemo(() => {
    if (type === 'dimensionValue') {
      // First try the prop
      if (props.dimensionName) {
        return props.dimensionName;
      }
      // Try to find it in the parent builder (for Selector filter, dimension and value are siblings)
      // Since we're scoped to 'value', we need to check the parent scope
      // This is a bit tricky - we'd need to access the parent's builder
      // For now, return null and rely on the prop
      return null;
    }
    return null;
  }, [type, props.dimensionName]);

  const loadOptions = async (inputValue: string): Promise<SelectableValue[]> => {
    if (!datasource) {
      return [];
    }

    // For table names, we don't need a table name
    if (type === 'table') {
      setIsLoading(true);
      try {
        return await fetchTableNames(datasource, inputValue || '');
      } finally {
        setIsLoading(false);
      }
    }

    // For other types, we need a table name
    if (!tableName) {
      return [];
    }

    // For dimension values, we need a dimension name
    if (type === 'dimensionValue' && !dimensionName) {
      return [];
    }

    setIsLoading(true);
    try {
      if (type === 'dimension') {
        return await fetchDimensionNames(datasource, tableName, inputValue || '');
      } else if (type === 'metric') {
        return await fetchMetrics(datasource, tableName, inputValue || '');
      } else {
        // Get root builder to access filters and intervals
        const rootBuilder = (props as any).rootBuilder || props.options.builder;
        return await fetchDimensionValues(datasource, tableName, dimensionName, inputValue || '', rootBuilder);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onChange = (option: SelectableValue<string> | null) => {
    if (option !== null) {
      onBuilderChange(props, option.value);
    } else {
      onBuilderChange(props, '');
    }
  };

  const currentValue = props.options.builder
    ? { value: props.options.builder, label: props.options.builder }
    : null;

  return (
    <InlineField label={props.label} tooltip={props.description} grow>
      <AsyncSelect
        value={currentValue}
        loadOptions={loadOptions}
        onChange={onChange}
        placeholder={props.description}
        defaultOptions={true}
        allowCustomValue={true}
        isClearable={true}
        isLoading={isLoading}
        cacheOptions={true}
        noOptionsMessage={
          !datasource
            ? 'Datasource not available'
            : type === 'table'
            ? 'No tables found'
            : !tableName
            ? 'Please select a table first'
            : type === 'dimensionValue' && !dimensionName
            ? 'Please select a dimension first'
            : 'No options found'
        }
      />
    </InlineField>
  );
};

