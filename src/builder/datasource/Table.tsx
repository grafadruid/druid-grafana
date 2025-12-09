import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput, Row } from '../abstract';

export const Table = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Table);
  return (
    <Row>
      <AutocompleteInput
        {...scopedProps('name')}
        label="Name"
        description="The table name"
        type="table"
        datasource={props.datasource}
      />
    </Row>
  );
};
Table.type = 'table';
Table.fields = ['name'];
