import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput, Code, Row } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Javascript = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Javascript);
  return (
    <>
      <AutocompleteInput
        {...scopedProps('dimension')}
        label="Dimension"
        description="The dimension name"
        type="dimension"
        datasource={props.datasource}
      />
      <ExtractionFn {...scopedProps('extractionFn')} />
      <Row>
        <Code
          {...scopedProps('function')}
          label="Function"
          description="The javascript function. e.g: function(x) { return(x >= 'bar' && x <= 'foo') }"
          lang="javascript"
          height="80px"
        />
      </Row>
    </>
  );
};
Javascript.type = 'javascript';
Javascript.fields = ['dimension', 'function', 'extractionFn'];
