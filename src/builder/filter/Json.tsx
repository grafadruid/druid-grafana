import React, { useMemo } from 'react';
import { InlineField, Select } from '@grafana/ui';
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

  const currentValue = valueProps.options.builder ?? '';
  const valueOption: SelectableValue<string> =
    variableOptions.find((o) => o.value === currentValue) ?? {
      value: currentValue,
      label: currentValue ? (currentValue.length > 60 ? currentValue.slice(0, 57) + '...' : currentValue) : 'Custom JSON or variable...',
    };

  return (
    <InlineField label={valueProps.label} tooltip={valueProps.description} grow>
      <Select
        options={variableOptions}
        value={valueOption}
        onChange={(option: SelectableValue<string> | null) => onBuilderChange(valueProps, option?.value ?? '')}
        onCreateOption={(v) => onBuilderChange(valueProps, v)}
        placeholder="JSON filter or variable (e.g. $variable_name)"
        allowCustomValue
        isClearable
      />
    </InlineField>
  );
};
Json.type = 'json';
Json.fields = ['value'];
