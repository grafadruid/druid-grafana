import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input } from '../abstract';

export const Json = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Json);
  return (
    <Input
      {...scopedProps('value')}
      label="Value"
      description="JSON filter or Grafana variable (e.g. $variable_name) containing JSON"
      type="text"
    />
  );
};
Json.type = 'json';
Json.fields = ['value'];
