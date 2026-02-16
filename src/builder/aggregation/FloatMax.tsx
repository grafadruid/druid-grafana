import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Checkbox } from '../abstract';

export const FloatMax = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, FloatMax);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed lue" type="text" />
      <AutocompleteInput
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="metric"
        datasource={props.datasource}
      />
      <Input {...scopedProps('expression')} label="Expression" description="The expression" type="text" />
      <Checkbox {...scopedProps('hidden')} label="Hidden" description="" />
    </>
  );
};
FloatMax.type = 'floatMax';
FloatMax.fields = ['name', 'fieldName', 'expression', 'hidden'];
