import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Row } from '../abstract';
import { RootFilter } from '../filter';

export const Filter = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Filter);
  return (
    <>
      <RootFilter {...scopedComponentProps('filter')} />
    </>
  );
};
Filter.type = 'filter';
Filter.fields = ['filter'];
