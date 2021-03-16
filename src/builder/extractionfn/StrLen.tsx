import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const StrLen = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, StrLen);
  return <Row>Returns the length of dimension values (as if they were encoded in UTF-16)</Row>;
};
StrLen.type = 'strlen';
StrLen.fields = [] as string[];
