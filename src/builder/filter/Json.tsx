import React, { useMemo, useState, useEffect } from 'react';
import { ChangeEvent } from 'react';
import { InlineField, Input as InputField, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, onBuilderChange } from '../abstract';

export const Json = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Json);
  const valueProps = scopedProps('value');

  const variableOptions = useMemo(() => {
    const templateSrv = getTemplateSrv();
    const variables = (templateSrv as { getVariables?: () => Array<{ name?: string }> }).getVariables?.() ?? [];
    return variables
      .map((v) => {
        const name = v?.name ?? '';
        return name ? { value: `$${name}`, label: `$${name}` } : null;
      })
      .filter((o): o is SelectableValue<string> => o != null);
  }, []);

  const builderValue = (valueProps.options.builder ?? '') as string;
  const [inputValue, setInputValue] = useState(builderValue);

  // Sync from builder when it changes (e.g. after picking a variable from dropdown)
  useEffect(() => {
    setInputValue(builderValue);
  }, [builderValue]);

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const v = event.target.value;
    setInputValue(v);
    onBuilderChange(valueProps, v);
  };

  const onVariableSelect = (option: SelectableValue<string> | null) => {
    if (option?.value != null) {
      setInputValue(option.value);
      onBuilderChange(valueProps, option.value);
    }
  };

  return (
    <InlineField label={valueProps.label} tooltip={valueProps.description} grow>
      <InputField
        name="json-filter-value"
        value={inputValue}
        onChange={onInputChange}
        placeholder="JSON filter or variable (e.g. $variable_name)"
      />
      {variableOptions.length > 0 && (
        <Select
          options={variableOptions}
          value={null}
          onChange={onVariableSelect}
          placeholder="Insert variable..."
          width={24}
          isClearable={false}
        />
      )}
    </InlineField>
  );
};
Json.type = 'json';
Json.fields = ['value'];
