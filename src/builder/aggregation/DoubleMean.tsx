import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Checkbox } from '../abstract';

export const DoubleMean = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, DoubleMean);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed value" type="text" />
      <AutocompleteInput
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="metric"
        datasource={props.datasource}
      />
      <Checkbox {...scopedProps('hidden')} label="Hidden" description="" />
    </>
  );
};
DoubleMean.type = 'doubleMean';
DoubleMean.fields = ['name', 'fieldName', 'hidden'];
