import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput } from '../abstract';
import { ExtractionFn } from '../extractionfn';
import { Bound } from '../bound';

export const Spatial = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Spatial);
  return (
    <>
      <AutocompleteInput
        {...scopedProps('dimension')}
        label="Dimension"
        description="The dimension name"
        type="dimension"
        datasource={props.datasource}
      />
      <Bound {...scopedProps('bound')} />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Spatial.type = 'spatial';
Spatial.fields = ['dimension', 'bound', 'extractionFn'];
