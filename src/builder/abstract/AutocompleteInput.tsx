import React, { useMemo, useState } from 'react';
import { InlineField, AsyncSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderFieldProps } from './types';
import { onBuilderChange } from '.';
import { DruidDataSource } from '../../DruidDataSource';

interface Props extends QueryBuilderFieldProps {
  type: 'dimension' | 'dimensionValue';
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
    // Use SQL query to get column names
    // Escape table name for double-quoted identifiers (for SHOW COLUMNS and SELECT * queries)
    const escapedTableNameForIdentifier = tableName.replace(/"/g, '""');
    // Escape table name for string literals (for INFORMATION_SCHEMA queries)
    const escapedTableNameForString = tableName.replace(/'/g, "''");

    let columnNames = new Set<string>();

    // Approach 1: Try SHOW COLUMNS (if Druid supports it)
    try {
      const showColumnsQuery = {
        builder: {
          queryType: 'sql',
          query: `SHOW COLUMNS FROM "${escapedTableNameForIdentifier}"`,
        },
        settings: {},
      };

      const showResponse = await datasource.postResource('query-variable', showColumnsQuery);

      if (Array.isArray(showResponse) && showResponse.length > 0) {
        // SHOW COLUMNS typically returns column names in the first column
        showResponse.forEach((item: any) => {
          const value = item.value || item.text;
          if (value && typeof value === 'string' && value.trim() !== '') {
            const lowerValue = value.toLowerCase().trim();
            if (lowerValue !== '__time' && !lowerValue.startsWith('_')) {
              columnNames.add(value);
            }
          }
        });
      }
    } catch (showError) {
      // SHOW COLUMNS might not be supported
      console.debug('SHOW COLUMNS not supported, trying alternative');
    }

    // Approach 2: Try INFORMATION_SCHEMA if available and we didn't get results
    if (columnNames.size === 0) {
      try {
        const infoSchemaQuery = {
          builder: {
            queryType: 'sql',
            query: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${escapedTableNameForString}'`,
          },
          settings: {},
        };

        const infoResponse = await datasource.postResource('query-variable', infoSchemaQuery);
        if (Array.isArray(infoResponse) && infoResponse.length > 0) {
          infoResponse.forEach((item: any) => {
            const value = item.value || item.text;
            if (value && typeof value === 'string' && value.trim() !== '') {
              const lowerValue = value.toLowerCase().trim();
              if (lowerValue !== '__time' && !lowerValue.startsWith('_')) {
                columnNames.add(value);
              }
            }
          });
        }
      } catch (infoError) {
        // INFORMATION_SCHEMA might not be available
        console.debug('INFORMATION_SCHEMA not available');
      }
    }

    // Approach 3: Fallback - query with LIMIT 1 and try to infer column structure
    // This is less reliable but might work if other methods fail
    if (columnNames.size === 0) {
      try {
        const sqlQuery = {
          builder: {
            queryType: 'sql',
            query: `SELECT * FROM "${escapedTableNameForIdentifier}" LIMIT 1`,
          },
          settings: {},
        };

        const response = await datasource.postResource('query-variable', sqlQuery);

        if (Array.isArray(response) && response.length > 0) {
          // Since prepareVariableResponse processes: for each column, for each row
          // We'll try to identify column names by looking at the response pattern
          // This is heuristic - we'll take unique string values that appear early in the response
          const seenValues = new Set<string>();
          const potentialColumns: string[] = [];

          // Take first reasonable number of unique string values
          for (let i = 0; i < Math.min(response.length, 100); i++) {
            const item = response[i];
            const value = item.value || item.text;
            if (value && typeof value === 'string' && value.trim() !== '') {
              const lowerValue = value.toLowerCase().trim();
              // Filter out system columns and values that look like data (dates, numbers, etc.)
              if (lowerValue !== '__time' &&
                  !lowerValue.startsWith('_') &&
                  lowerValue !== 'timestamp' &&
                  !seenValues.has(value) &&
                  !/^\d{4}-\d{2}-\d{2}/.test(value) && // Not a date
                  !/^\d+(\.\d+)?$/.test(value)) { // Not a number
                seenValues.add(value);
                potentialColumns.push(value);
              }
            }
          }

          // If we got a reasonable number (between 1 and 50), use them
          if (potentialColumns.length > 0 && potentialColumns.length <= 50) {
            potentialColumns.forEach(col => columnNames.add(col));
          }
        }
      } catch (queryError) {
        console.debug('Error with fallback column query:', queryError);
      }
    }

    // Filter by input value (substring match) and sort
    const filtered = Array.from(columnNames)
      .filter((name) => !inputValue || name.toLowerCase().includes(inputValue.toLowerCase()))
      .map((name) => ({
        value: name,
        label: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 10); // Limit to 10 results

    return filtered;
  } catch (error) {
    console.error('Error fetching dimension names:', error);
    return [];
  }
};

const fetchDimensionValues = async (
  datasource: DruidDataSource,
  tableName: string | null,
  dimensionName: string | null,
  inputValue: string
): Promise<SelectableValue[]> => {
  if (!tableName || !dimensionName) {
    console.debug('fetchDimensionValues: Missing tableName or dimensionName', { tableName, dimensionName });
    return [];
  }

  try {
    // Use SQL query to get dimension values
    // Escape the dimension name to prevent SQL injection
    const escapedTableName = tableName.replace(/"/g, '""');
    const escapedDimensionName = dimensionName.replace(/"/g, '""');

    // Use the simplest possible query - just select the column
    // We'll handle DISTINCT, filtering, and limiting in JavaScript
    const sqlQueryStr = `SELECT "${escapedDimensionName}" FROM "${escapedTableName}" LIMIT 100`;

    const sqlQuery = {
      builder: {
        queryType: 'sql',
        query: sqlQueryStr,
      },
      settings: {},
    };

    const response = await datasource.postResource('query-variable', sqlQuery);

    // The response from query-variable returns MetricFindValue format
    // Extract unique values from SQL results and filter by substring match
    const values = new Set<string>();

    if (Array.isArray(response) && response.length > 0) {
      response.forEach((item: any) => {
        // Try both value and text fields
        const value = item.value !== undefined && item.value !== null ? item.value : (item.text !== undefined && item.text !== null ? item.text : null);
        if (value !== null && value !== undefined) {
          const strValue = String(value);
          // If no input value, show all results. Otherwise filter by substring match
          if (strValue.trim() !== '') {
            if (!inputValue || inputValue.trim() === '' || strValue.toLowerCase().includes(inputValue.toLowerCase())) {
              values.add(strValue);
            }
          }
        }
      });
    }

    // Return filtered results
    if (values.size > 0) {
      return Array.from(values)
        .map((val) => ({
          value: val,
          label: val,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(0, 10); // Limit to 10 results
    }

    return [];
  } catch (error) {
    console.error('Error fetching dimension values:', error);
    console.error('Query details:', { tableName, dimensionName, inputValue });
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
    if (!datasource || !tableName) {
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
      } else {
        return await fetchDimensionValues(datasource, tableName, dimensionName, inputValue || '');
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
          !datasource || !tableName
            ? 'Please select a table first'
            : type === 'dimensionValue' && !dimensionName
            ? 'Please select a dimension first'
            : 'No options found'
        }
      />
    </InlineField>
  );
};

