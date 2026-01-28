import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Multiple } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const In = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, In);
  return (
    <>
      <Input {...scopedProps('dimension')} label="Dimension" description="The dimension name" type="text" />
      <Multiple
        {...scopedProps('values')}
        label="Values"
        description="The values"
        component={Input}
        componentExtraProps={{
          label: 'Value',
          description: 'A value',
          type: 'text',
        }}
      />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
In.type = 'in';
In.fields = ['dimension', 'values', 'extractionFn'];
