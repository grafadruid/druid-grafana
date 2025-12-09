import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Row } from '../abstract';

export const LongLast = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, LongLast);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed value" type="text" />
      <AutocompleteInput
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="metric"
        datasource={props.datasource}
      />
    </Row>
  );
};
LongLast.type = 'count';
LongLast.fields = ['name', 'fieldName'];
