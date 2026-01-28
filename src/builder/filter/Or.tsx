import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Multiple } from '../abstract';
import { Filter } from './';

export const Or = (props: QueryBuilderProps & { inline?: boolean }) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Or);
  return (
    <Multiple
      {...scopedProps('fields')}
      label="Filters"
      description="The filters"
      component={Filter}
      componentExtraProps={{ inline: props.inline }}
    />
  );
};
Or.type = 'or';
Or.fields = ['fields'];
