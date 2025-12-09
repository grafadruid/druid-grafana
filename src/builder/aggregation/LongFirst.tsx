import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Row } from '../abstract';

export const LongFirst = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, LongFirst);
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
    </Row>
  );
};
LongFirst.type = 'longFirst';
LongFirst.fields = ['name', 'fieldName'];
