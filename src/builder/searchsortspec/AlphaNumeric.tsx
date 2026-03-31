import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit } from '../abstract';

export const AlphaNumeric = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, AlphaNumeric);
  return null;
};
AlphaNumeric.type = 'alphanumeric';
AlphaNumeric.fields = [] as string[];
