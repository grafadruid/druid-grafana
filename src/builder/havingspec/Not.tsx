import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Row } from '../abstract';
import { HavingSpec } from './';

export const Not = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Not);
  return (
    <>
      <HavingSpec {...scopedProps('havingSpec')} />
    </>
  );
};
Not.type = 'not';
Not.fields = ['havingSpec'];
