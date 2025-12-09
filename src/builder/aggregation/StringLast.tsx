import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Row } from '../abstract';

export const StringLast = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, StringLast);
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
      <Input {...scopedProps('maxStringBytes')} label="Max string bytes" description="Max string bytes" type="number" />
    </Row>
  );
};
StringLast.type = 'stringLast';
StringLast.fields = ['name', 'fieldName', 'maxStringBytes'];
