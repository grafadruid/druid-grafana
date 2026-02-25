import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Select, Row } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Extraction = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Extraction);
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
        <Select
          {...scopedProps('outputType')}
          label="Output type"
          description="The output type"
          entries={{ STRING: 'String', LONG: 'Long', FLOAT: 'Float' }}
        />
        <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Extraction.type = 'extraction';
Extraction.fields = ['dimension', 'outputName', 'outputType', 'extractionFn'];
