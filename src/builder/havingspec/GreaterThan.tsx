import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput } from '../abstract';

export const GreaterThan = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, GreaterThan);
  return (
    <>
      <AutocompleteInput {...scopedProps('aggregation')} label="Aggregation" description="the metric column" type="metric" datasource={props.datasource} />
      <Input {...scopedProps('value')} label="Value" description="The numeric value" type="number" />
    </>
  );
};
GreaterThan.type = 'greaterThan';
GreaterThan.fields = ['aggregation', 'value'];
