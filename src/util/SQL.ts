import * as NodeSqlParser from 'node-sql-parser';

export const SQL = (() => {
  const parser = new NodeSqlParser.Parser();
  const options = {
    database: 'postgresql',
  };

  const api = {
    parse: (queryString: string) => parser.astify(queryString, options),
    parseSelectQuery: (queryString: string) => {
      const query = api.parse(queryString);
      if (Array.isArray(query)) {
        throw Error('Unexpected mutiple sql query');
      }
      if (query.type !== 'select') {
        throw Error('Unexpected non-select query type');
      }
      return query as SqlSelectQuery;
    },
    stringify: (query: NodeSqlParser.AST) => parser.sqlify(query, options),
  };
  return api;
})();

interface SqlColumnRef {
  type: 'column_ref';
  table: string | null;
  column: string;
}

interface SqlStringValue {
  type: 'single_quote_string';
  value: string;
}

interface SqlNullValue {
  type: 'null';
  value: null;
}

interface SqlNumberValue {
  type: 'number';
  value: number;
}

interface SqlUnaryExpression {
  type: 'unary_expr';
  operator: string;
  expr: SqlExpression;
}

type SqlBinaryExpression =
  | {
      type: 'binary_expr';
      operator: string;
      left: SqlExpression;
      right: SqlExpression;
    }
  | {
      type: 'binary_expr';
      operator: string;
      left: SqlColumnRef;
      right: SqlValue;
    };

export type SqlValue = SqlStringValue | SqlNullValue | SqlNumberValue;

export type SqlExpression = SqlBinaryExpression | SqlUnaryExpression;

export interface SqlSelectQuery extends NodeSqlParser.Select {
  where: SqlExpression | null;
}
