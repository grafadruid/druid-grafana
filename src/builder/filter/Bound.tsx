import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Checkbox, Select } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Bound = (props: QueryBuilderProps & { inline?: boolean }) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Bound);
  return (
    <>
      <Input {...scopedProps('dimension')} label="Dimension" description="The dimension to filter on" type="text" />
      <Input {...scopedProps('lower')} label="Lower" description="The lower bound for the filter" type="text" />
      <Checkbox
        {...scopedProps('lowerStrict')}
        label="Lower strict"
        description="Perform strict comparison on the lower bound ('>' instead of '>=')"
      />
      <Input {...scopedProps('upper')} label="Upper" description="The upper bound for the filter" type="text" />
      <Checkbox
        {...scopedProps('upperStrict')}
        label="Upper strict"
        description="Perform strict comparison on the upper bound ('<' instead of '<=')"
      />
      <Select
        {...scopedProps('ordering')}
        label="Ordering"
        description="Specifies the sorting order to use when comparing values against the bound."
        entries={{
          lexicographic: 'Lexicographic',
          alphanumeric: 'Alphanumeric',
          strlen: 'String len',
          numeric: 'Numeric',
          version: 'Version',
        }}
      />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Bound.type = 'bound';
Bound.fields = [
  'dimension',
  'lower',
  'lowerStrict',
  'upper',
  'upperStrict',
  'ordering',
  'extractionFn',
];
