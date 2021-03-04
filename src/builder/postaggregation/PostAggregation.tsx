import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import {
  Arithmetic,
  Constant,
  DoubleGreatest,
  DoubleLeast,
  FieldAccess,
  FinalizingFieldAccess,
  HyperUniqueCardinality,
  Javascript,
  LongGreatest,
  LongLeast,
} from './';

export const PostAggregation = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    name="PostAggregation"
    components={{
      Arithmetic: Arithmetic,
      Constant: Constant,
      DoubleGreatest: DoubleGreatest,
      DoubleLeast: DoubleLeast,
      FieldAccess: FieldAccess,
      FinalizingFieldAccess: FinalizingFieldAccess,
      HyperUniqueCardinality: HyperUniqueCardinality,
      Javascript: Javascript,
      LongGreatest: LongGreatest,
      LongLeast: LongLeast,
    }}
    queryBuilderProps={props}
  />
);
