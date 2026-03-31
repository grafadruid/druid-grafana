import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';

export const Lexicographic = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Lexicographic);
  return (
    <>
      <Input
        {...scopedProps('previousStop')}
        label="Previous stop"
        description="The starting point of the sort"
        type="text"
      />
    </>
  );
};
Lexicographic.type = 'lexicographic';
Lexicographic.fields = ['previousStop'];
