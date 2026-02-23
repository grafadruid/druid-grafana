import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Multiple } from '../abstract';
import { HavingSpec } from './';

export const And = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, And);
  return (
    <>
      <Multiple
        {...scopedProps('havingSpecs')}
        label="And"
        description="The having filters"
        component={HavingSpec}
        componentExtraProps={{}}
      />
    </>
  );
};
And.type = 'and';
And.fields = ['havingSpecs'];
