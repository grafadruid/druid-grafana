import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, QueryBuilderComponentSelector } from '../abstract';
import { FieldAccess, FinalizingFieldAccess, Javascript } from './';

export const QuantilesDoublesSketchToQuantile = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, QuantilesDoublesSketchToQuantile);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the value" type="text" />
      <QueryBuilderComponentSelector
        {...scopedProps('field')}
        label="Field"
        components={{
          FieldAccess: FieldAccess,
          FinalizingFieldAccess: FinalizingFieldAccess,
          Javascript: Javascript,
        }}
      />
      <Input
        {...scopedProps('fraction')}
        label="Fraction"
        description="fractional position in the hypothetical sorted stream"
        type="number"
      />
    </>
  );
};
QuantilesDoublesSketchToQuantile.type = 'quantilesDoublesSketchToQuantile';
QuantilesDoublesSketchToQuantile.fields = ['name', 'field', 'fraction'];
