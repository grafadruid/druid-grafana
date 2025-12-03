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
    // Escape table name to prevent SQL injection
    const escapedTableName = tableName.replace(/"/g, '""');
    
    let columnNames = new Set<string>();
    
    // Approach 1: Try SHOW COLUMNS (if Druid supports it)
    try {
      const showColumnsQuery = {
        builder: {
          queryType: 'sql',
          query: `SHOW COLUMNS FROM "${escapedTableName}"`,
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
            query: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${escapedTableName}' ORDER BY COLUMN_NAME`,
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
            query: `SELECT * FROM "${escapedTableName}" LIMIT 1`,
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
    
    // Filter by input value and sort
    const filtered = Array.from(columnNames)
      .filter((name) => !inputValue || name.toLowerCase().includes(inputValue.toLowerCase()))
      .map((name) => ({
        value: name,
        label: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 200); // Limit to 200 results
    
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
    return [];
  }

  try {
    // Use SQL query to get distinct dimension values
    // Escape the dimension name and input value to prevent SQL injection
    const escapedTableName = tableName.replace(/"/g, '""');
    const escapedDimensionName = dimensionName.replace(/"/g, '""');
    const escapedInputValue = (inputValue || '').replace(/'/g, "''");
    
    // Build the WHERE clause
    let whereClause = `"${escapedDimensionName}" IS NOT NULL`;
    if (inputValue && inputValue.trim() !== '') {
      // Use LIKE for pattern matching (case-insensitive)
      whereClause += ` AND LOWER(CAST("${escapedDimensionName}" AS VARCHAR)) LIKE LOWER('%${escapedInputValue}%')`;
    }
    
    const sqlQuery = {
      builder: {
        queryType: 'sql',
        query: `SELECT DISTINCT CAST("${escapedDimensionName}" AS VARCHAR) as value FROM "${escapedTableName}" WHERE ${whereClause} ORDER BY value LIMIT 100`,
      },
      settings: {},
    };

    const response = await datasource.postResource('query-variable', sqlQuery);
    
    if (Array.isArray(response)) {
      // The response from query-variable returns MetricFindValue format
      // Extract unique values from SQL results
      const values = new Set<string>();
      response.forEach((item: any) => {
        const value = item.value || item.text;
        if (value !== null && value !== undefined) {
          const strValue = String(value);
          if (strValue.trim() !== '') {
            values.add(strValue);
          }
        }
      });
      
      return Array.from(values)
        .map((val) => ({
          value: val,
          label: val,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(0, 100); // Limit to 100 results
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

    setIsLoading(true);
    try {
      if (type === 'dimension') {
        return await fetchDimensionNames(datasource, tableName, inputValue);
      } else {
        return await fetchDimensionValues(datasource, tableName, dimensionName, inputValue);
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
        noOptionsMessage={datasource && tableName ? 'No options found' : 'Please select a table first'}
      />
    </InlineField>
  );
};

