import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Multiple } from '../abstract';
import { Dimension } from '../dimension';

export const ColumnComparison = (props: QueryBuilderProps & { inline?: boolean }) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, ColumnComparison);
  return (
    <Multiple
      {...scopedProps('dimensions')}
      label="Dimensions"
      description="The dimensions"
      component={Dimension}
      componentExtraProps={{ inline: props.inline }}
    />
  );
};
ColumnComparison.type = 'columnComparison';
ColumnComparison.fields = ['dimensions'];
