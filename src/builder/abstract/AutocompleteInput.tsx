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
    // Call backend autocomplete endpoint
    const response = await datasource.postResource('autocomplete', {
      tableName,
      type: 'dimension',
      inputValue,
    });

    if (Array.isArray(response)) {
      return response.map((item: any) => ({
        value: item.value || item.text,
        label: item.text || item.value,
      }));
    }

    return [];
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
    // Call backend autocomplete endpoint
    const response = await datasource.postResource('autocomplete', {
      tableName,
      type: 'dimensionValue',
      dimensionName,
      inputValue,
    });

    if (Array.isArray(response)) {
      return response.map((item: any) => ({
        value: item.value || item.text,
        label: item.text || item.value,
      }));
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

