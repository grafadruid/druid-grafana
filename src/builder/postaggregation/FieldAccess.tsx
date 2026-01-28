import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input } from '../abstract';

export const FieldAccess = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, FieldAccess);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the value" type="text" />
      <Input {...scopedProps('fieldName')} label="Field name" description="Name of the aggregator" type="text" />
    </>
  );
};
FieldAccess.type = 'fieldAccess';
FieldAccess.fields = ['name', 'fieldName'];
