import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput, Input } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Like = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Like);
  return (
    <>
      <AutocompleteInput
        {...scopedProps('dimension')}
        label="Dimension"
        description="The dimension to filter on."
        type="dimension"
        datasource={props.datasource}
      />
      <Input
        {...scopedProps('pattern')}
        label="Pattern"
        description="LIKE pattern, such as 'foo%' or '___bar'."
        type="text"
      />
      <Input
        {...scopedProps('escape')}
        label="Escape"
        description="An escape character that can be used to escape special characters."
        type="text"
      />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Like.type = 'like';
Like.fields = ['dimension', 'pattern', 'escape', 'extractionFn'];
