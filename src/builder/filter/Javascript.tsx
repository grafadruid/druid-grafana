import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Code } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Javascript = (props: QueryBuilderProps & { inline?: boolean }) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Javascript);
  return (
    <>
      <Input {...scopedProps('dimension')} label="Dimension" description="The dimension name" type="text" />
      <Code
        {...scopedProps('function')}
        label="Function"
        description="The javascript function. e.g: function(x) { return(x >= 'bar' && x <= 'foo') }"
        lang="javascript"
      />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Javascript.type = 'javascript';
Javascript.fields = ['dimension', 'function', 'extractionFn'];
