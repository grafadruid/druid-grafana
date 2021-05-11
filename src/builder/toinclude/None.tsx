import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const None = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, None);
  return <Row>No column should be included in the result.</Row>;
};
None.type = 'none';
None.fields = [] as string[];
