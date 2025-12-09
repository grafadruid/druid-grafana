import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Row } from '../abstract';

export const DoubleFirst = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, DoubleFirst);
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
DoubleFirst.type = 'doubleFirst';
DoubleFirst.fields = ['name', 'fieldName'];
