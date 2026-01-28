import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput } from '../abstract';

export const DoubleSum = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, DoubleSum);
  return (
    <>
      <AutocompleteInput
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="metric"
        datasource={props.datasource}
      />
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed value" type="text" />
      <Input {...scopedProps('expression')} label="Expression" description="The expression" type="text" />
    </>
  );
};
DoubleSum.type = 'doubleSum';
DoubleSum.fields = ['name', 'fieldName', 'expression'];
