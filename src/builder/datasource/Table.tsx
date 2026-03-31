import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput } from '../abstract';

export const Table = (props: QueryBuilderProps & { inline?: boolean }) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Table);
  return (
    <AutocompleteInput
      {...scopedProps('name')}
      label="Name"
      description="The table name"
      type="table"
      datasource={props.datasource}
    />
  );
};
Table.type = 'table';
Table.fields = ['name'];
