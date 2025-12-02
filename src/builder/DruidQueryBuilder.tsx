import React from 'react';
import { Query } from './query';
import { QueryBuilderProps } from './types';

export const DruidQueryBuilder = (props: QueryBuilderProps) => {
  // Let the query editor decide when to execute the query (and if it should be debounced).
  // The builder itself should update immediately on every keystroke so that controlled inputs
  // stay in sync with the underlying query model.
  return <Query {...props} />;
};
