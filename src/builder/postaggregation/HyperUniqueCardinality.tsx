import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input } from '../abstract';

export const HyperUniqueCardinality = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, HyperUniqueCardinality);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the value" type="text" />
      <Input {...scopedProps('fieldName')} label="Field name" description="Name of the aggregator" type="text" />
    </>
  );
};
HyperUniqueCardinality.type = 'hyperUniqueCardinality';
HyperUniqueCardinality.fields = ['name', 'fieldName'];
