import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv, logWarning } from '@grafana/runtime';
import { SQL, type SqlExpression } from './util/SQL';
import type { DruidSettings, DruidQuery, AdhocVariableModel, AdhocFilter } from './types';

const druidVariableRegex = /\"\[\[(\w+)(?::druid:(\w+))?\]\]\"|\"\${(\w+)(?::druid:(\w+))?}\"/g;

export class DruidDataSource extends DataSourceWithBackend<DruidQuery, DruidSettings> {
  settingsData: DruidSettings;

  constructor(instanceSettings: DataSourceInstanceSettings<DruidSettings>) {
    super(instanceSettings);

    // This proxy is needed for the JS to actually adheer to the current TS type
    this.settingsData = new Proxy(instanceSettings.jsonData, {
      get(_, key: string) {
        return Object.fromEntries(
          Object.entries(instanceSettings.jsonData)
            .filter((it) => it[0].startsWith(key))
            .map((it) => [it[0].substring(`${key}.`.length), it[1]])
        );
      },
    });
  }

  /**
   * Provides autocompletion for adhoc filter values given the chosen key
   */
  async getTagValues(options: { key: string }): Promise<MetricFindValue[]> {
    if (!this.settingsData.adhoc?.shouldAutocompleteValue) {
      return [];
    }

    const tableNames = (
      await this._postSqlQuery(
        `SELECT "TABLE_NAME" FROM INFORMATION_SCHEMA.COLUMNS WHERE "TABLE_SCHEMA" = 'druid' AND "COLUMN_NAME" = '${options.key}'`
      )
    ).map((it) => it.value);

    const completions = (
      await Promise.all(
        tableNames.map(async (tableName) =>
          this._postSqlQuery(
            this.settingsData.adhoc?.shouldLimitAutocompleteValue
              ? `SELECT "${options.key}" FROM ${tableName} GROUP BY "${options.key}" ORDER BY COUNT("${options.key}") DESC LIMIT 1000`
              : `SELECT DISTINCT "${options.key}" FROM ${tableName}`
          )
        )
      )
    ).reduce((acc, it) => [...acc, ...it], []);

    return completions;
  }

  /**
   * Provides autocompletion for adhoc filter keys
   */
  async getTagKeys() {
    return this._postSqlQuery(`SELECT "COLUMN_NAME" FROM INFORMATION_SCHEMA.COLUMNS WHERE "TABLE_SCHEMA" = 'druid'`);
  }

  filterQuery(query: DruidQuery) {
    return !query.hide;
  }

  _applyAdhocTemplateVariablesToSQL(templatedQuery: DruidQuery, adhocFilters: AdhocFilter[]) {
    const query = SQL.parseSelectQuery(templatedQuery.builder.query);

    if (Array.isArray(query)) {
      /*
       * Maybe implement multi-query as syntactic sugar for UNION-ALL?
       * UNION-ALL: <https://druid.apache.org/docs/latest/querying/sql.html#union-all>
       *
       * Ex multi-query input:
       * SELECT foo FROM bar,
       * SELECT biz FROM boz
       *
       * Ex UNION-ALL result:
       * SELECT foo FROM bar
       * UNION ALL
       * SELECT biz FROM boz
       */
      throw new Error('Multi-query not yet supported');
    }

    const initialWhere = (() => {
      if (query.where) {
        return query.where;
      }
      const firstAdhoc = adhocFilters.pop();
      return {
        type: 'binary_expr',
        operator: firstAdhoc?.operator,
        left: {
          type: 'column_ref',
          table: null,
          column: firstAdhoc?.key,
        },
        right: {
          type: 'single_quote_string',
          value: firstAdhoc?.value,
        },
      } as SqlExpression;
    })();

    query.where = adhocFilters.reduce<SqlExpression>((acc, filter) => {
      const expression = ((): SqlExpression => {
        if (filter.operator === '<' || filter.operator === '>') {
          return {
            type: 'binary_expr',
            operator: filter.operator,
            left: {
              type: 'column_ref',
              table: null,
              column: filter.key,
            },
            right:
              typeof filter.value === 'number'
                ? {
                    type: 'number',
                    value: filter.value,
                  }
                : {
                    type: 'single_quote_string',
                    value: String(filter.value),
                  },
          };
        } else if (filter.operator === '!~') {
          return {
            type: 'binary_expr',
            operator: 'NOT LIKE',
            left: {
              type: 'column_ref',
              table: null,
              column: filter.key,
            },
            right: {
              type: 'single_quote_string',
              value: `%${filter.value}%`,
            },
          };
        } else if (filter.operator === '=~') {
          return {
            type: 'binary_expr',
            operator: 'LIKE',
            left: {
              type: 'column_ref',
              table: null,
              column: filter.key,
            },
            right: {
              type: 'single_quote_string',
              value: `%${filter.value}%`,
            },
          };
        }
        return {
          type: 'binary_expr',
          operator: filter.operator,
          left: {
            type: 'column_ref',
            table: null,
            column: filter.key,
          },
          right: {
            type: 'single_quote_string',
            value: String(filter.value),
          },
        };
      })();

      return {
        type: 'binary_expr',
        operator: 'AND',
        left: acc,
        right: expression,
      };
    }, initialWhere);

    return {
      ...templatedQuery,
      builder: {
        ...templatedQuery.builder,
        query: SQL.stringify(query),
      },
    };
  }

  _applyAdhocTemplateVariablesToNativeQuery(templatedQuery: DruidQuery, adhocFilters: AdhocFilter[]) {
    return {
      ...templatedQuery,
      builder: {
        ...templatedQuery.builder,
        filter: {
          type: 'and',
          fields: [
            templatedQuery.builder.filter,
            ...adhocFilters.map((it) => {
              switch (it.operator) {
                case '=':
                  return {
                    type: 'selector',
                    dimension: it.key,
                    value: it.value,
                  };
                case '!=':
                  return {
                    type: 'not',
                    field: {
                      type: 'selector',
                      dimension: it.key,
                      value: it.value,
                    },
                  };
                case '<':
                  return {
                    type: 'bound',
                    ordering: 'numeric',
                    dimension: it.key,
                    upper: it.value,
                  };
                case '>':
                  return {
                    type: 'bound',
                    ordering: 'numeric',
                    dimension: it.key,
                    lower: it.value,
                  };
                case '=~':
                  return {
                    type: 'like',
                    dimension: it.key,
                    pattern: `%${it.value}%`,
                  };
                case '!~':
                  return {
                    type: 'not',
                    field: {
                      type: 'like',
                      dimension: it.key,
                      value: `%${it.value}%`,
                    },
                  };
              }
            }),
          ],
        },
      },
    };
  }

  _applyAdhocTemplateVariables(templatedQuery: DruidQuery) {
    const adhocFilters = getTemplateSrv()
      .getVariables()
      .filter((it): it is AdhocVariableModel => it.type === 'adhoc')
      .filter((it) => it.datasource && it.datasource.uid === this.uid)
      .reduce<AdhocFilter[]>((acc, it) => [...acc, ...it.filters], [])
      .filter((it) => it.value !== undefined)
      .filter((it) => {
        if (['<', '>', '=', '!=', '=~', '!~'].includes(it.operator)) {
          return true;
        }
        logWarning(`Skipping unexpected filter operator: ${it.operator}`);
        return false;
      });

    if (adhocFilters.length === 0) {
      return templatedQuery;
    }

    switch (templatedQuery.builder.queryType) {
      case 'sql':
        return this._applyAdhocTemplateVariablesToSQL(templatedQuery, adhocFilters);
      case 'timeseries':
      case 'topN':
      case 'groupBy':
      case 'scan':
      case 'search':
      case 'timeBoundary':
        return this._applyAdhocTemplateVariablesToNativeQuery(templatedQuery, adhocFilters);
      default:
        return templatedQuery;
    }
  }

  applyTemplateVariables(templatedQuery: DruidQuery, scopedVars?: ScopedVars) {
    const template = JSON.stringify({
      ...templatedQuery,
      expr: undefined,
    }).replace(druidVariableRegex, (match, variable1, format1, variable2, format2) => {
      if (format1 || format2 === 'json') {
        return '${' + (variable1 || variable2) + ':doublequote}';
      }
      return match;
    });
    return this._applyAdhocTemplateVariables({
      ...JSON.parse(getTemplateSrv().replace(template, scopedVars)),
      expr: templatedQuery.expr,
    });
  }

  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query));
  }

  async _postSqlQuery(queryString: string): Promise<Array<{ value: string; text: string }>> {
    const query: DruidQuery = {
      builder: {
        queryType: 'sql',
        query: queryString,
      },
      settings: {
        contextParameters: [
          {
            name: 'AA',
            value: 'BB',
          },
        ],
        format: 'long',
      },
      expr: '',
      refId: '',
    };
    return this.postResource('query-variable', {
      ...query,
      expr: JSON.stringify(query),
    });
  }
}
