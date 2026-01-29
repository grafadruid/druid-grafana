import React, { useMemo, useState, useEffect } from 'react';
import { InlineField, AsyncSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderFieldProps } from './types';
import { onBuilderChange } from '.';
import { DruidDataSource } from '../../DruidDataSource';
import { DruidQuery } from '../../types';

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
    console.error('fetchDimensionValues: Missing tableName or dimensionName', { tableName, dimensionName });
    return [];
  }

  try {
    // Use Druid search query to get dimension values
    // This replaces the SQL approach with native Druid search queries
    // Get intervals - should be in object format { type: 'intervals', intervals: [...] }
    let intervalsObj: any = {
      type: 'intervals',
      intervals: ['${__from:date:iso}/${__to:date:iso}'],
    };
    if (rootBuilder?.intervals) {
      if (rootBuilder.intervals.type === 'intervals' && Array.isArray(rootBuilder.intervals.intervals)) {
        intervalsObj = rootBuilder.intervals;
      } else if (Array.isArray(rootBuilder.intervals)) {
        intervalsObj = {
          type: 'intervals',
          intervals: rootBuilder.intervals,
        };
      }
    }

    // Build dataSource - should be object format { type: 'table', name: '...' }
    let dataSource: any = { type: 'table', name: tableName };
    if (rootBuilder?.dataSource) {
      if (typeof rootBuilder.dataSource === 'object' && rootBuilder.dataSource.name) {
        dataSource = rootBuilder.dataSource;
      } else if (typeof rootBuilder.dataSource === 'string') {
        dataSource = { type: 'table', name: rootBuilder.dataSource };
      }
    }

    // Build searchDimensions - should be array of dimension objects
    const searchDimensions = [
      {
        type: 'default',
        dimension: dimensionName,
      },
    ];

    const searchQueryObj: any = {
      queryType: 'search',
      dataSource: dataSource,
      granularity: 'all',
      intervals: intervalsObj,
      searchDimensions: searchDimensions,
      limit: inputValue && inputValue.trim() !== '' ? 10 : 20, // More results when no filter
    };

    // Build search query - use contains for filtering
    // Search query requires a query field, use empty string to get all values when no input
    searchQueryObj.query = {
      type: 'contains',
      value: inputValue && inputValue.trim() !== '' ? inputValue : 'a',
    };

    // Build filters array - start with existing filters from root builder if any
    const filters: any[] = [];
    if (rootBuilder?.filter) {
      // Deep copy the existing filter to avoid mutating the original
      const existingFilter = JSON.parse(JSON.stringify(rootBuilder.filter));

      // Helper function to validate and filter out incomplete filters
      const isValidFilter = (filter: any): boolean => {
        if (!filter || typeof filter !== 'object') return false;

        // Selector filters must have a value
        if (filter.type === 'selector') {
          if (filter.value === undefined || filter.value === null || filter.value === '') {
            return false;
          }
        }

        return true;
      };

      // If the existing filter is already an "and" filter, extract its fields to avoid nesting
      if (existingFilter.type === 'and' && Array.isArray(existingFilter.fields)) {
        const validFields = existingFilter.fields.filter(isValidFilter);
        if (validFields.length > 0) {
          filters.push(...validFields);
        }
      } else {
        if (isValidFilter(existingFilter)) {
          filters.push(existingFilter);
        }
      }
    }

    // Set filter in search query - if we have filters, combine them, otherwise set to null
    if (filters.length > 0) {
      if (filters.length === 1) {
        searchQueryObj.filter = filters[0];
      } else {
        searchQueryObj.filter = {
          type: 'and',
          fields: filters,
        };
      }
    } else {
      searchQueryObj.filter = null;
    }

    // using regular query execution
    // refId is required by DataQuery interface - used for response identification in backend
    const query: DruidQuery = {
      refId: 'searchAutoSuggest',
      builder: searchQueryObj,
      settings: {},
      expr: JSON.stringify({ builder: searchQueryObj, settings: {} }),
    };

    // This sends the query directly to Druid via the normal query execution flow
    // requestId is used by Grafana for request tracking - simple string is sufficient
    // datasource.query() returns an Observable, so we need to convert it to a Promise
    const queryObservable = datasource.query({
      targets: [query],
      requestId: 'autocomplete-' + Date.now(), // requestId with timestamp
      interval: '1s',
      intervalMs: 1000,
      scopedVars: {},
      timezone: 'browser',
      app: 'dashboard',
      startTime: Date.now(),
      range: {
        from: { valueOf: () => Date.now() - (7 * 24 * 60 * 60 * 1000) }, // 7 days ago
        to: { valueOf: () => Date.now() },
      },
    } as any);

    // Convert Observable to Promise - get the first (and only) value
    const response = await new Promise<any>((resolve, reject) => {
      const subscription = queryObservable.subscribe({
        next: (value: any) => {
          subscription.unsubscribe();
          resolve(value);
        },
        error: (err: any) => {
          subscription.unsubscribe();
          reject(err);
        },
      });
    });

    // Extract unique values from search query response
    // Search query returns frames with dimension values
    // The dimension values are in string fields (excluding timestamp field)
    const values = new Set<string>();

    if (response.data && Array.isArray(response.data)) {
      response.data.forEach((frame: any) => {
        if (frame.fields && Array.isArray(frame.fields)) {
          frame.fields.forEach((field: any) => {
            // Extract distinct values from the "value" column
            // Search query response has columns: timestamp, dimension, value, count
            // We need to get distinct values from the "value" column
            if (
              field.name === 'value' &&
              field.values &&
              Array.isArray(field.values)
            ) {
              field.values.forEach((val: any) => {
                if (val !== null && val !== undefined) {
                  const strValue = String(val);
                  if (strValue.trim() !== '') {
                    values.add(strValue);
                  }
                }
              });
            }
          });
        }
      });
    }

    // Return results (already filtered and sorted by search query)
    // Limit to 10 distinct results
    if (values.size > 0) {
      const resultArray = Array.from(values)
        .map((val) => ({
          value: val,
          label: val,
        }))
        .slice(0, 10); // Limit to 10 results for display

      return resultArray;
    }

    return [];
  } catch (error) {
    console.error('Error fetching dimension values:', error);
    return [];
  }
};

export const AutocompleteInput = (props: Props) => {
  const { datasource, type, debounceTime = 300 } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');

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
      setInputValue(option.value || '');
    } else {
      onBuilderChange(props, '');
      setInputValue('');
    }
  };

  const onInputChange = (newValue: string, actionMeta: any) => {
    // Allow editing the input value
    setInputValue(newValue);
  };

  const currentValue = props.options.builder
    ? { value: props.options.builder, label: props.options.builder }
    : null;

  // Sync inputValue with current value from builder (only when builder changes externally)
  useEffect(() => {
    const currentBuilderValue = props.options.builder || '';
    setInputValue(currentBuilderValue);
  }, [props.options.builder]);

  return (
    <InlineField label={props.label} tooltip={props.description} grow>
      <AsyncSelect
        value={currentValue}
        inputValue={inputValue}
        onInputChange={onInputChange}
        loadOptions={loadOptions}
        onChange={onChange}
        placeholder={props.description}
        defaultOptions={true}
        allowCustomValue={false}
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

