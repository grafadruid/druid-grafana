import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Checkbox } from '../abstract';

export const LongFirst = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, LongFirst);
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
      <Checkbox
        {...scopedProps('hidden')}
        label="Hidden"
        description="If set, this aggregation is still sent to Druid and can be used by post-aggregations, but is not shown as a series in the panel"
      />
    </>
  );
};
LongFirst.type = 'longFirst';
LongFirst.fields = ['name', 'fieldName', 'hidden'];
