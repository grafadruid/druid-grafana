import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Checkbox } from '../abstract';
import { Aggregation } from './';
import { Filter } from '../filter';

export const Filtered = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Filtered);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed value" type="text" />
      <Filter {...scopedProps('filter')} />
      <Aggregation {...scopedProps('aggregator')} />
      <Checkbox {...scopedProps('hidden')} label="Hidden" description="" />
    </>
  );
};
Filtered.type = 'filtered';
Filtered.fields = ['name', 'filter', 'aggregator', 'hidden'];
