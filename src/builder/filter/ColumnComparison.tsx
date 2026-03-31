import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Multiple, Row } from '../abstract';
import { GroupByDimension } from '../dimension';

export const ColumnComparison = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, ColumnComparison);
  return (
    <Row>
      <Multiple
        {...scopedProps('dimensions')}
        label="Dimensions"
        description="The dimensions"
        component={GroupByDimension}
        componentExtraProps={{}}
        inlineItems
      />
    </Row>
  );
};
ColumnComparison.type = 'columnComparison';
ColumnComparison.fields = ['dimensions'];
