import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const False = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, False);
  return (
    <Row>
      The false filter is a filter which matches no value. It can be used to temporarily disable other filters without
      removing the filter.
    </Row>
  );
};
False.type = 'false';
False.fields = [] as string[];
