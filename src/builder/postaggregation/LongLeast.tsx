import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Multiple } from '../abstract';
import { PostAggregation } from './.';

export const LongLeast = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, LongLeast);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the value" type="text" />
      <Multiple
        {...scopedProps('fields')}
        label="Fields"
        description="The post-aggregators fields to returns the least value from"
        component={PostAggregation}
        componentExtraProps={{}}
      />
    </>
  );
};
LongLeast.type = 'longLeast';
LongLeast.fields = ['name', 'fields'];
