import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Checkbox, Row } from '../abstract';
import { Map } from '../lookup';

export const Lookup = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Lookup);
  return (
    <>
      <Row>
        <Map {...scopedProps('lookup')} />
      </Row>
      <Row>
        <Input
          {...scopedProps('replaceMissingValueWith')}
          label="Replace missing value with"
          description="the missing value replacement text"
          type="text"
        />
      </Row>
      <Row>
        <Checkbox
          {...scopedProps('retainMissingValue')}
          label="Retain missing value?"
          description="Specifies if the missing value should be retained"
        />
      </Row>
      <Row>
        <Checkbox {...scopedProps('injective')} label="Injective?" description="Specifies if the lookup is injective" />
      </Row>
      <Row>
        <Checkbox
          {...scopedProps('optimize')}
          label="Optimize?"
          description="Specifies if the lookup should be optimized"
        />
      </Row>
    </>
  );
};
Lookup.type = 'lookup';
Lookup.fields = ['lookup', 'retainMissingValue', 'replaceMissingValueWith', 'injective', 'optimize'];
