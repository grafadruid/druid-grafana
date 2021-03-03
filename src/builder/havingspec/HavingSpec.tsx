import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { And, DimSelector, EqualTo, Filter, GreaterThan, LessThan, Not, Or } from './';

export const HavingSpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    name="HavingSpec"
    components={{
      And: And,
      DimSelector: DimSelector,
      EqualTo: EqualTo,
      Filter: Filter,
      GreaterThan: GreaterThan,
      LessThan: LessThan,
      Not: Not,
      Or: Or,
    }}
    queryBuilderProps={props}
  />
);
