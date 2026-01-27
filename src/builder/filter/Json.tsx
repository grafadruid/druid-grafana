import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Code, Row } from '../abstract';

export const Json = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Json);
  const valueScopedProps = scopedProps('value');

  return (
    <>
      <Row>
        <Code
          {...valueScopedProps}
          label="Value"
          description="Enter a JSON filter string or variable like $variable_name. Variables will be replaced, then the value will be parsed as JSON filter."
          lang="hjson"
        />
      </Row>
    </>
  );
};
Json.type = 'json';
Json.fields = ['value'];
