import React, { ChangeEvent } from 'react';
import { Input as InputField, InlineField } from '@grafana/ui';
import { QueryBuilderFieldProps } from './types';
import { onBuilderChange } from '.';

interface Props extends QueryBuilderFieldProps {
  type: string;
  /** When true and value is empty or 0, pass undefined so the key is omitted from the query JSON (e.g. for optional scan batchSize) */
  omitWhenEmpty?: boolean;
}

export const Input = (props: Props) => {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    let value: string | number = event.target.value;
    if (
      props.type === 'number' &&
      !(value.indexOf('$') === 0 || value.indexOf('[') === 0 || value.indexOf('.') === value.length - 1)
    ) {
      //must be a number, but is not a variable, nor an incomplete float, so, convert to Number or fallback to previous valid value
      value = Number(value);
      if (isNaN(value)) {
        value = props.options.builder || '';
      }
    }
    if (props.omitWhenEmpty && (value === '' || value === 0)) {
      onBuilderChange(props, undefined);
    } else {
      onBuilderChange(props, value);
    }
  };
  return (
    <InlineField label={props.label} grow>
      <InputField
        name={props.name}
        placeholder={props.description}
        value={props.options.builder === undefined ? '' : props.options.builder}
        onChange={onChange}
      />
    </InlineField>
  );
};
