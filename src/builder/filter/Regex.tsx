import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput, Input } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Regex = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Regex);
  return (
    <>
      <AutocompleteInput
        {...scopedProps('dimension')}
        label="Dimension"
        description="The dimension name"
        type="dimension"
        datasource={props.datasource}
      />
      <Input {...scopedProps('pattern')} label="Pattern" description="The regex pattern" type="text" />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Regex.type = 'regex';
Regex.fields = ['dimension', 'pattern', 'extractionFn'];
