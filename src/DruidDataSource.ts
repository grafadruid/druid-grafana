import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv, logWarning } from '@grafana/runtime';
import { DruidSettings, DruidQuery, AdhocVariableModel, AdhocFilter } from './types';

const druidVariableRegex = /\"\[\[(\w+)(?::druid:(\w+))?\]\]\"|\"\${(\w+)(?::druid:(\w+))?}\"/g;

export class DruidDataSource extends DataSourceWithBackend<DruidQuery, DruidSettings> {
  settingsData: DruidSettings;

  constructor(instanceSettings: DataSourceInstanceSettings<DruidSettings>) {
    super(instanceSettings);
    this.settingsData = instanceSettings.jsonData;
  }

  filterQuery(query: DruidQuery) {
    return !query.hide;
  }

  _applyAdhocTemplateVariables(templatedQuery: DruidQuery, scopedVars?: ScopedVars) {
    const adhocFilters = getTemplateSrv()
      .getVariables()
      .filter((it): it is AdhocVariableModel => it.type === 'adhoc')
      .filter((it) => it.datasource.uid === this.uid)
      .reduce((acc, it) => [...acc, ...it.filters], [] as AdhocFilter[]);

    if (adhocFilters.length === 0) {
      return templatedQuery;
    }

    switch (templatedQuery.builder.queryType) {
      case 'sql':
        return {
          ...templatedQuery,
          builder: {
            ...templatedQuery.builder,
            query: `${templatedQuery.builder.query} AND ${adhocFilters
              .map((it) => {
                switch (it.operator) {
                  case '=':
                  case '!=':
                  case '<':
                  case '>':
                    return `${it.key} ${it.operator} '${it.value}'`;

                  case '=~':
                    return `${it.key} LIKE '${it.value}'`;
                  case '!~':
                    return `${it.key} NOT LIKE '${it.value}'`;
                  default:
                    logWarning(`Skipping unexpected filter operator: ${it.operator}`);
                    return '';
                }
              })
              .filter(Boolean)
              .join(' AND ')}`,
          },
        };
      case 'timeseries':
      case 'topN':
      case 'groupBy':
      case 'scan':
      case 'search':
      case 'timeBoundary':
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
                        pattern: it.value,
                      };
                    case '!~':
                      return {
                        type: 'not',
                        field: {
                          type: 'like',
                          dimension: it.key,
                          value: it.value,
                        },
                      };
                    default:
                      logWarning(`Skipping unexpected filter operator: ${it.operator}`);
                      return {
                        type: 'true',
                      };
                  }
                }),
              ],
            },
          },
        };
      default:
        return templatedQuery;
    }
  }

  applyTemplateVariables(templatedQuery: DruidQuery, scopedVars?: ScopedVars) {
    const templateSrv = getTemplateSrv();
    const template = JSON.stringify({
      ...this._applyAdhocTemplateVariables(templatedQuery, scopedVars),
      expr: undefined,
    }).replace(druidVariableRegex, (match, variable1, format1, variable2, format2) => {
      if (format1 || format2 === 'json') {
        return '${' + (variable1 || variable2) + ':doublequote}';
      }
      return match;
    });
    return { ...JSON.parse(templateSrv.replace(template, scopedVars)), expr: templatedQuery.expr };
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

  /**
   * Provides autocompletion for adhoc filter keys
   */
  async getTagKeys(): Promise<MetricFindValue[]> {
    return this._postSqlQuery(`SELECT "COLUMN_NAME" FROM INFORMATION_SCHEMA.COLUMNS WHERE "TABLE_SCHEMA" = 'druid'`);
  }

  /**
   * Provides autocompletion for adhoc filter values given the chosen key
   */
  async getTagValues(options: { key: string }): Promise<MetricFindValue[]> {
    const tableNames = (
      await this._postSqlQuery(
        `SELECT "TABLE_NAME" FROM INFORMATION_SCHEMA.COLUMNS WHERE "TABLE_SCHEMA" = 'druid' AND "COLUMN_NAME" = '${options.key}'`
      )
    ).map((it) => it.value);

    return (
      await Promise.all(
        tableNames.map(async (tableName) => this._postSqlQuery(`SELECT DISTINCT "${options.key}" FROM ${tableName}`))
      )
    ).reduce((acc, it) => [...acc, ...it], []);
  }
}
