import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const All = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, All);
  return <Row>All columns should be included in the result.</Row>;
};
All.type = 'all';
All.fields = [] as string[];
