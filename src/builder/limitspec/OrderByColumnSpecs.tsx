import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput, Select, Row } from '../abstract';

export const OrderByColumnSpecs = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, OrderByColumnSpecs);
  return (
    <>
      <AutocompleteInput
        {...scopedProps('dimension')}
        label="Dimension"
        description="Dimension or metric name to order by"
        type="dimension"
        datasource={props.datasource}
      />
      <Select
        {...scopedProps('direction')}
        label="Direction"
        description="Specifies the sort direction"
        entries={{
          ascending: 'Ascending',
          descending: 'Descending',
        }}
      />
      <Select
        {...scopedProps('dimensionOrder')}
        label="Ordering"
        description="Specifies the sorting order to use"
        entries={{
          lexicographic: 'Lexicographic',
          alphanumeric: 'Alphanumeric',
          strlen: 'String len',
          numeric: 'Numeric',
          version: 'Version',
        }}
      />
    </>
  );
};
OrderByColumnSpecs.type = '';
OrderByColumnSpecs.fields = ['dimension', 'direction', 'dimensionOrder'];
