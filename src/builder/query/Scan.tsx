import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderProps, useScopedQueryBuilderFieldProps, Multiple, Input, Select, Row, AutocompleteInput } from '../abstract';
import { DataSource } from '../datasource';
import { RootFilter } from '../filter';
import { Intervals } from '../querysegmentspec';

export const Scan = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Scan);
  const scopedComponentProps = useScopedQueryBuilderProps(props, Scan);
  return (
    <>
      <Row>
        <DataSource {...scopedComponentProps('dataSource')} inline />
      </Row>
      <Row>
        <RootFilter {...scopedComponentProps('filter')} />
      </Row>
      <Row>
        <Multiple
          {...scopedProps('columns')}
          label="Columns"
          description="The columns names (dimensions and metrics)"
          component={AutocompleteInput}
          componentExtraProps={{
            label: undefined,
            description: 'The column name (dimension or metric)',
            type: 'column',
            datasource: props.datasource,
            rootBuilder: props.options.builder,
          }}
        />
      </Row>
      <Row>
        <Select
          {...scopedProps('order')}
          label="Order"
          description="Specifies the sort order"
          entries={{
            none: 'None',
            ascending: 'Ascending',
            descending: 'Descending',
          }}
        />
        <Input {...scopedProps('limit')} label="Limit" description="How many rows to return" type="number" omitWhenEmpty />
        <Input
          {...scopedProps('batchSize')}
          label="Batch size"
          description="The maximum number of rows buffered"
          type="number"
          omitWhenEmpty
        />
      </Row>
    </>
  );
};
Scan.queryType = 'scan';
Scan.fields = ['dataSource', 'intervals', 'filter', 'columns', 'order', 'limit', 'batchSize'];
