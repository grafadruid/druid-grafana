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
  return (
    <InlineField label={props.label} tooltip={props.description} grow>
      <SelectField
        options={entries}
        value={props.options.builder}
        onChange={onChange}
        placeholder={props.description}
        isClearable
      />
    </InlineField>
  );
};
