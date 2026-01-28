import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input } from '../abstract';

export const Constant = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Constant);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name" type="text" />
      <Input {...scopedProps('value')} label="Value" description="The value to return" type="number" />
    </>
  );
};
Constant.type = 'constant';
Constant.fields = ['name', 'value'];
