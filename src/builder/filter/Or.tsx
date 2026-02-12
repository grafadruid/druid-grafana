import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Multiple } from '../abstract';
import { Filter } from './';

export const Or = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Or);
  return (
        <Multiple
          {...scopedProps('fields')}
          label="Fields"
          description="The filters Fields"
          component={Filter}
          componentExtraProps={{}}
        />
  );
};
Or.type = 'or';
Or.fields = ['fields'];
