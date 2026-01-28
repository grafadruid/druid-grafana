import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input } from '../abstract';
import { ExtractionFn } from '../extractionfn';
import { Bound } from '../bound';

export const Spatial = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Spatial);
  return (
    <>
      <Input {...scopedProps('dimension')} label="Dimension" description="The dimension name" type="text" />
      <Bound {...scopedProps('bound')} />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Spatial.type = 'spatial';
Spatial.fields = ['dimension', 'bound', 'extractionFn'];
