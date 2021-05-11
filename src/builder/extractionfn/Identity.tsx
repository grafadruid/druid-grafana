import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const Identity = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Identity);
  return <Row>Identity. Whatever it does.</Row>;
};
Identity.type = 'identity';
Identity.fields = [] as string[];
