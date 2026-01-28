import React, { useMemo } from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Selector = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Selector);
  const dimensionScopedProps = scopedProps('dimension');
  const valueScopedProps = scopedProps('value');
  
  // Get the current dimension name for the value autocomplete
  const dimensionName = useMemo(() => {
    return dimensionScopedProps.options.builder || null;
  }, [dimensionScopedProps.options.builder]);
  
  return (
    <>
      <AutocompleteInput 
        {...dimensionScopedProps} 
        label="Dimension" 
        description="the dimension name" 
        type="dimension"
        datasource={props.datasource}
      />
      <AutocompleteInput 
        {...valueScopedProps} 
        label="Value" 
        description="the dimension value" 
        type="dimensionValue"
        datasource={props.datasource}
        dimensionName={dimensionName}
      />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Selector.type = 'selector';
Selector.fields = ['dimension', 'value', 'extractionFn'];
