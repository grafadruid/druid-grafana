import React from 'react';
import { Query } from './query';
import { QueryBuilderProps } from './types';

export const DruidQueryBuilder = (props: QueryBuilderProps) => {
  return <Query {...props} />;
};
