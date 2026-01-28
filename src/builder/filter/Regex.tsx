import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Regex = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Regex);
  return (
    <>
      <Input {...scopedProps('dimension')} label="Dimension" description="The dimension name" type="text" />
      <Input {...scopedProps('pattern')} label="Pattern" description="The regex pattern" type="text" />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Regex.type = 'regex';
Regex.fields = ['dimension', 'pattern', 'extractionFn'];
