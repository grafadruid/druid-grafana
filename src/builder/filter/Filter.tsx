import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import {
  And,
  Bound,
  ColumnComparison,
  Expression,
  False,
  Interval,
  In,
  Javascript,
  Json,
  Like,
  Not,
  Or,
  Regex,
  Search,
  Selector,
  Spatial,
  True,
} from './';

export const Filter = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    {...props}
    label="Filter"
    default={And}
    components={{
      And: And,
      Bound: Bound,
      ColumnComparison: ColumnComparison,
      Expression: Expression,
      False: False,
      Interval: Interval,
      In: In,
      Javascript: Javascript,
      Json: Json,
      Like: Like,
      Not: Not,
      Or: Or,
      Regex: Regex,
      Search: Search,
      Selector: Selector,
      Spatial: Spatial,
      True: True,
    }}
  />
);
