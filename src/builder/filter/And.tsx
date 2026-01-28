import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Multiple } from '../abstract';
import { Filter } from './';

export const And = (props: QueryBuilderProps & { inline?: boolean }) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, And);
  return (
    <Multiple
      {...scopedProps('fields')}
      label="Fields"
      description="The filter fields"
      component={Filter}
      componentExtraProps={{ inline: props.inline }}
    />
  );
};
And.type = 'and';
And.fields = ['fields'];
