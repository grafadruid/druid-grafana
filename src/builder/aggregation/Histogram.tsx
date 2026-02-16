import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Multiple, Checkbox } from '../abstract';

export const Histogram = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Histogram);
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
      <Multiple
        {...scopedProps('breaks')}
        label="Breaks"
        description="The histogram breaks"
        component={Input}
        componentExtraProps={{
          label: 'Break',
          description: 'An histogram break',
          type: 'number',
        }}
      />
      <Checkbox {...scopedProps('hidden')} label="Hidden" />
    </>
  );
};
Histogram.type = 'histogram';
Histogram.fields = ['name', 'fieldName', 'breaks', 'hidden'];
