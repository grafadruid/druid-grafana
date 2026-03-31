import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { And, In, Json, Not, Or, Regex, Search, Selector } from './';

export const Filter = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    {...props}
    label="Filter"
    components={{
      And: And,
      In: In,
      Json: Json,
      Not: Not,
      Or: Or,
      Regex: Regex,
      Search: Search,
      Selector: Selector,
    }}
  />
);
