import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector, Row } from '../abstract';
import { And, DimSelector, EqualTo, Filter, GreaterThan, LessThan, Not, Or } from './';

export const HavingSpec = (props: QueryBuilderProps) => (
  <Row>
    <QueryBuilderComponentSelector
      {...props}
      label="HavingSpec"
      inline
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
    />
  </Row>
);
