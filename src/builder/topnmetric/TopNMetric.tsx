import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { AlphaNumeric, Dimension, Inverted, Lexicographic, Numeric } from './';

export const TopNMetric = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    name="TopNMetric"
    components={{
      AlphaNumeric: AlphaNumeric,
      Dimension: Dimension,
      Inverted: Inverted,
      Lexicographic: Lexicographic,
      Numeric: Numeric,
    }}
    queryBuilderProps={props}
  />
);
