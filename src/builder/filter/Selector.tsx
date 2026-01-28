import React, { useMemo } from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Row } from '../abstract';
import { ExtractionFn } from '../extractionfn';
import { FilterTuning } from '.';

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
      <Row>
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
      </Row>
      <Row>
        <ExtractionFn {...scopedProps('extractionFn')} />
      </Row>
      <Row>
        <FilterTuning {...scopedProps('filterTuning')} />
      </Row>
    </>
  );
};
Selector.type = 'selector';
Selector.fields = ['dimension', 'value', 'extractionFn', 'filterTuning'];
