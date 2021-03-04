import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { AlphaNumeric, Lexicographic, Numeric, StrLen, Version } from './';

export const SearchSortSpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    name="SearchSortSpec"
    components={{
      AlphaNumeric: AlphaNumeric,
      Lexicographic: Lexicographic,
      Numeric: Numeric,
      StrLen: StrLen,
      Version: Version,
    }}
    queryBuilderProps={props}
  />
);
