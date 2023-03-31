import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv, logDebug } from '@grafana/runtime';
import { DruidSettings, DruidQuery, AdhocVariableModel } from './types';

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
    const adhocVariables = getTemplateSrv().getVariables()
      .filter((it): it is AdhocVariableModel => it.type === 'adhoc');
    if (adhocVariables.length === 0) return templatedQuery;

    switch (templatedQuery.builder.queryType) {
      case 'sql':
        return ({
          ...templatedQuery,
          builder: {
            ...templatedQuery.builder,
            query: `${templatedQuery.builder.query}${
              adhocVariables
                .reduce((acc, it) => [
                  ...acc,
                  ...it.filters
                    .map(it => it.operator === '=~' ? ({
                      ...it,
                      operator: 'LIKE',
                    }) : it.operator === '!~' ? ({
                      ...it,
                      operator: 'NOT LIKE',
                    }) : it)
                    .map(it => `${it.key} ${it.operator} '${it.value}'`)
                ], [/* adds leading " AND "*/''] as string[])
                .join(' AND ')
            }`,
          }
        });
      default:
        logDebug(`Adhoc variables aren't supported for queries of type "${templatedQuery.builder.queryType}"`);
        return templatedQuery;
    }
  }

  applyTemplateVariables(templatedQuery: DruidQuery, scopedVars?: ScopedVars) {
    const templateSrv = getTemplateSrv();
    const template = JSON.stringify({ ...this._applyAdhocTemplateVariables(templatedQuery, scopedVars), expr: undefined }).replace(
      druidVariableRegex,
      (match, variable1, format1, variable2, format2) => {
        if (format1 || format2 === 'json') {
          return '${' + (variable1 || variable2) + ':doublequote}';
        }
        return match;
      }
    );
    return { ...JSON.parse(templateSrv.replace(template, scopedVars)), expr: templatedQuery.expr };
  }

  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query));
  }

  async _postSqlQuery(queryString: string): Promise<{ value: string; text: string; }[]> {
    const query: DruidQuery = {
      builder: {
        queryType: 'sql',
        query: queryString
      },
      settings: {
        contextParameters: [
            {
                name: 'AA',
                value: 'BB'
            }
        ],
        format: 'long'
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
    const tableNames = (await this._postSqlQuery(`SELECT "TABLE_NAME" FROM INFORMATION_SCHEMA.COLUMNS WHERE "TABLE_SCHEMA" = 'druid' AND "COLUMN_NAME" = '${options.key}'`))
      .map((it) => it.value);

    return (
      await Promise.all(tableNames.map(async (tableName) => this._postSqlQuery(`SELECT DISTINCT "${options.key}" FROM ${tableName}`)))
    ).reduce((acc, it) => [
      ...acc,
      ...it
    ], []);
  }
}
