import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput } from '../abstract';
import { ExtractionFn } from '../extractionfn';
import { SearchQuerySpec } from '../searchqueryspec';

export const Search = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Search);
  return (
    <>
      <AutocompleteInput
        {...scopedProps('dimension')}
        label="Dimension"
        description="the dimension name"
        type="dimension"
        datasource={props.datasource}
      />
      <SearchQuerySpec {...scopedProps('query')} />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
Search.type = 'search';
Search.fields = ['dimension', 'query', 'extractionFn'];
