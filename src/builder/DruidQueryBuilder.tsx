import React from 'react';
import { Query } from './query';
import { QueryBuilderProps } from './types';
import { debounce } from 'lodash';

export const DruidQueryBuilder = (props: QueryBuilderProps) => {
  return (
    <Query {...props} />
  );
};
