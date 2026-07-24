import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Row } from '../abstract';
import { DruidSqlEditor } from './sql/DruidSqlEditor';

export const Sql = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Sql);
  return (
    <Row>
      <DruidSqlEditor
        {...scopedProps('query')}
        label={undefined}
        description="The SQL query. e.g: SELECT * FROM datasource"
      />
    </Row>
  );
};
Sql.queryType = 'sql';
Sql.fields = ['query'];
