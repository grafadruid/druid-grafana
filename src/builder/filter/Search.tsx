import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input } from '../abstract';
import { ExtractionFn } from '../extractionfn';
import { SearchQuerySpec } from '../searchqueryspec';

export const Search = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Search);
  return (
    <>
      <Input {...scopedProps('dimension')} label="Dimension" description="the dimension name" type="text" />
      <SearchQuerySpec {...scopedProps('query')} />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Search.type = 'search';
Search.fields = ['dimension', 'query', 'extractionFn'];
