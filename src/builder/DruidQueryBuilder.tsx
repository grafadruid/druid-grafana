import React from 'react';
import { Query } from './query';
import { QueryBuilderProps } from './types';
import { debounce } from 'lodash';

export const DruidQueryBuilder = (props: QueryBuilderProps) => {
  const debouncedOnOptionsChange = debounce(props.onOptionsChange, props.options.settings.debounceTime || 250);
  const newProps = { ...props, onOptionsChange: debouncedOnOptionsChange };
  return <Query {...newProps} />;
};
