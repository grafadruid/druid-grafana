import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import {
  And,
  Bound,
  ColumnComparison,
  Expression,
  Extraction,
  False,
  FilterTuning,
  Interval,
  In,
  Javascript,
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
    name="Filter"
    components={{
      And: And,
      Bound: Bound,
      ColumnComparison: ColumnComparison,
      Expression: Expression,
      Extraction: Extraction,
      False: False,
      FilterTuning: FilterTuning,
      Interval: Interval,
      In: In,
      Javascript: Javascript,
      Like: Like,
      Not: Not,
      Or: Or,
      Regex: Regex,
      Search: Search,
      Selector: Selector,
      Spatial: Spatial,
      True: True,
    }}
    queryBuilderProps={props}
  />
);
