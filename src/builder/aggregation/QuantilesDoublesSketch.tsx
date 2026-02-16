import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Checkbox } from '../abstract';

export const QuantilesDoublesSketch = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, QuantilesDoublesSketch);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the sketch" type="text" />
      <AutocompleteInput
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to create a sketch"
        type="metric"
        datasource={props.datasource}
      />
      <Input {...scopedProps('k')} label="k" description="Parameter that controls size and accuracy" type="number" />
      <Checkbox
        {...scopedProps('hidden')}
        label="Hidden"
        description="If set, this aggregation is still sent to Druid and can be used by post-aggregations, but is not shown as a series in the panel"
      />
    </>
  );
};
QuantilesDoublesSketch.type = 'quantilesDoublesSketch';
QuantilesDoublesSketch.fields = ['name', 'fieldName', 'k', 'hidden'];
