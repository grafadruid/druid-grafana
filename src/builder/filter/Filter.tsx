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

export const Filter = (props: QueryBuilderProps & { inline?: boolean }) => (
  <QueryBuilderComponentSelector
    {...props}
    label="Filter"
    default={And}
    inline={props.inline}
    components={{
      And: And,
      Bound: Bound,
      ColumnComparison: ColumnComparison,
      Expression: Expression,
      Extraction: Extraction,
      False: False,
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
  />
);
