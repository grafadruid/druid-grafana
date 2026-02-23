import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput } from '../abstract';

export const LessThan = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, LessThan);
  return (
    <>
      <AutocompleteInput {...scopedProps('aggregation')} label="Aggregation" description="the metric column" type="metric" datasource={props.datasource} />
      <Input {...scopedProps('value')} label="Value" description="The numeric value" type="number" />
    </>
  );
};
LessThan.type = 'lessThan';
LessThan.fields = ['aggregation', 'value'];
