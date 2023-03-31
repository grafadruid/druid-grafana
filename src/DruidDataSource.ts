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
                  ...it.filters.map(it => `${it.key} ${it.operator} '${it.value}'`)
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
    return this.postResource('query-variable', this.applyTemplateVariables(query)).then((response) => {
      return response;
    });
  }

  /**
   * Provides autocompletion for adhoc filter keys
   */
  async getTagKeys(): Promise<MetricFindValue[]> {
    return [
      {
        text: 'channel',
      }
    ]
  }

  /**
   * Provides autocompletion for adhoc filter values given the chosen key
   */
  async getTagValues(options: { key: string }): Promise<MetricFindValue[]> {
    console.log('getTagValues', options);
    return [
      {
        text: '#en.wikipedia'
      },
      {
        text: '#pl.wikipedia'
      }
    ]
  }
}
