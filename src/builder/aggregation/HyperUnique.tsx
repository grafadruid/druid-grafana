import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput, Checkbox, Row } from '../abstract';

export const HyperUnique = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, HyperUnique);
  return (
    <Row>
      <AutocompleteInput
        {...scopedProps('fieldName')}
        label="Field name"
        description="Name of the metric column to sum over"
        type="metric"
        datasource={props.datasource}
      />
      <Input {...scopedProps('name')} label="Name" description="Output name for the summed lue" type="text" />
      <Checkbox
        {...scopedProps('round')}
        label="Round"
        description="Set to true to round off estimated lues to whole numbers"
      />
    </Row>
  );
};
HyperUnique.type = 'hyperUnique';
HyperUnique.fields = ['name', 'fieldName', 'round'];
