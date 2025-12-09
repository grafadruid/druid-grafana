import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Row } from '../abstract';

export const LongMin = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, LongMin);
  return (
    <Row>
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed lue" type="text" />
      <AutocompleteInput
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="metric"
        datasource={props.datasource}
      />
      <Input {...scopedProps('expression')} label="Expression" description="The expression" type="text" />
    </Row>
  );
};
LongMin.type = 'longMin';
LongMin.fields = ['name', 'fieldName', 'expression'];
