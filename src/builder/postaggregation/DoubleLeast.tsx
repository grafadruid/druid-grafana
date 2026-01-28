import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Multiple } from '../abstract';
import { PostAggregation } from './.';

export const DoubleLeast = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, DoubleLeast);
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
DoubleLeast.type = 'doubleLeast';
DoubleLeast.fields = ['name', 'fields'];
