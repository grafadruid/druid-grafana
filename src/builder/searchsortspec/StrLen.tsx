import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit } from '../abstract';

export const StrLen = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, StrLen);
  return null;
};
StrLen.type = 'strlen';
StrLen.fields = [] as string[];
