import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit } from '../abstract';

export const Lexicographic = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Lexicographic);
  return null;
};
Lexicographic.type = 'lexicographic';
Lexicographic.fields = [] as string[];
