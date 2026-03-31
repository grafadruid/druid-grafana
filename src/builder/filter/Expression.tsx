import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input } from '../abstract';

export const Expression = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Expression);
  return (
    <>
      <Input {...scopedProps('expression')} label="Expression" description="The expression" type="text" />
    </>
  );
};
Expression.type = 'expression';
Expression.fields = ['expression'];
