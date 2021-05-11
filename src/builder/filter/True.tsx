import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const True = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, True);
  return (
    <Row>
      The true filter is a filter which matches all values. It can be used to temporarily disable other filters without
      removing the filter.
    </Row>
  );
};
True.type = 'true';
True.fields = [] as string[];
