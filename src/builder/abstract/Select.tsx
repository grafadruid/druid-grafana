import React from 'react';
import { InlineField, Select as SelectField } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderFieldProps } from './types';
import { onBuilderChange } from '.';

interface Props extends QueryBuilderFieldProps {
  entries: Record<string | number, string>;
}

export const Select = (props: Props) => {
  const onChange = (option: SelectableValue<string>) => {
    if (null !== option) {
      onBuilderChange(props, option.value);
    }
  };
  const entries = Object.entries(props.entries).map((entry) => {
    return { value: entry[0], label: String(entry[1]) };
  });
  const builder = props.options.builder;
  const isPrimitive = builder === null || builder === undefined || typeof builder === 'string' || typeof builder === 'number';
  const hasCustomValue = isPrimitive && entries.filter((entry) => entry.value === builder).length === 0;
  if (hasCustomValue) {
    entries.push({ value: String(builder), label: String(builder) });
  }
  const selectValue = isPrimitive ? builder : undefined;
  return (
    <InlineField label={props.label} tooltip={props.description} grow>
      <SelectField
        options={entries}
        value={selectValue}
        onChange={onChange}
        placeholder={props.description}
        onCreateOption={(v) => {
          onChange({ value: v, label: v });
        }}
        allowCustomValue
        isClearable
      />
    </InlineField>
  );
};
