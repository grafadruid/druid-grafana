import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Checkbox } from '../abstract';

export const Count = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Count);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed value" type="text" />
      <Checkbox
        {...scopedProps('hidden')}
        label="Hidden"
        description="If set, this aggregation is still sent to Druid and can be used by post-aggregations, but is not shown as a series in the panel"
      />
    </>
  );
};
Count.type = 'count';
Count.fields = ['name', 'hidden'];
