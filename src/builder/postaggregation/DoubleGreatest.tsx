import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Multiple } from '../abstract';
import { PostAggregation } from './.';

export const DoubleGreatest = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, DoubleGreatest);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the value" type="text" />
      <Multiple
        {...scopedProps('fields')}
        label="Fields"
        description="The post-aggregators fields to returns the greatest value from"
        component={PostAggregation}
        componentExtraProps={{}}
      />
    </>
  );
};
DoubleGreatest.type = 'doubleGreatest';
DoubleGreatest.fields = ['name', 'fields'];
