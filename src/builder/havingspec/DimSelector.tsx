import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, AutocompleteInput } from '../abstract';

export const DimSelector = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, DimSelector);
  return (
    <>
      <AutocompleteInput {...scopedProps('aggregation')} label="Aggregation" description="the metric column" type="metric" datasource={props.datasource} />
      <Input {...scopedProps('value')} label="Value" description="the numeric value" type="number" />
    </>
  );
};
DimSelector.type = 'dimSelector';
DimSelector.fields = ['aggregation', 'value'];
