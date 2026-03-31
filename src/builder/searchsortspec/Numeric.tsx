import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit } from '../abstract';

export const Numeric = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Numeric);
  return null;
};
Numeric.type = 'numeric';
Numeric.fields = [] as string[];
