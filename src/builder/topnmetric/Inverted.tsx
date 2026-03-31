import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderProps, Row } from '../abstract';
import { TopNMetric } from './';

export const Inverted = (props: QueryBuilderProps) => {
  const scopedComponentProps = useScopedQueryBuilderProps(props, Inverted);
  return (
    <>
      <TopNMetric {...scopedComponentProps('metric')} />
    </>
  );
};
Inverted.type = 'inverted';
Inverted.fields = ['metric'];
