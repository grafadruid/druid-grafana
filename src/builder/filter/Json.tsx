import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';

export const Json = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Json);
  const valueScopedProps = scopedProps('value');

  return (
    <>
      <Row>
        <Input
          {...valueScopedProps}
          label="Value"
          description="The variable will be replaced with the actual filter JSON when the query executes."
          type="text"
        />
      </Row>
    </>
  );
};
Json.type = 'json';
Json.fields = ['value'];
