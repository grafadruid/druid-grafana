import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps } from '../abstract';
import { Filter } from './';

export const Not = (props: QueryBuilderProps & { inline?: boolean }) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Not);
  return (
    <Filter {...scopedProps('field')} inline={props.inline} />
  );
};
Not.type = 'not';
Not.fields = ['field'];
