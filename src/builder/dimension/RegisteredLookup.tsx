import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Checkbox, Row } from '../abstract';

export const RegisteredLookup = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, RegisteredLookup);
  return (
    <>
        <Input {...scopedProps('dimension')} label="Dimension" description="The dimension name" type="text" />
        <Input
          {...scopedProps('outputName')}
          label="Output name"
          description="The, optionnal, dimension output name"
          type="text"
          omitWhenEmpty
        />
      <Row>
        <Input {...scopedProps('lookup')} label="Lookup" description="The registered lookup name" type="text" />
        <Checkbox
          {...scopedProps('retainMissingValue')}
          label="Retain missing value"
          description=""
        />
        <Input
          {...scopedProps('replaceMissingValueWith')}
          label="Replace missing value with"
          description="The missing value replacement text"
          type="text"
        />
        <Checkbox
          {...scopedProps('injective')}
          label="Injective?"
          description="Specifies if the lookup is injective or not"
        />
        <Checkbox
          {...scopedProps('optimize')}
          label="Optimize?"
          description="Specifies if the lookup should be optimized"
        />
      </Row>
    </>
  );
};
RegisteredLookup.type = 'registeredLookup';
RegisteredLookup.fields = [
  'dimension',
  'outputName',
  'lookup',
  'retainMissingValue',
  'replaceMissingValueWith',
  'injective',
  'optimize',
];
