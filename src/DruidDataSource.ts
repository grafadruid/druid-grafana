import { isArray, map, replace } from 'lodash';

import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';

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
  applyTemplateVariables(templatedQuery: DruidQuery, scopedVars?: ScopedVars) {
    const templateSrv = getTemplateSrv();
    let template = JSON.stringify({ ...templatedQuery, expr: undefined }).replace(
      druidVariableRegex,
      (match, variable1, format1, variable2, format2) => {
        if (format1 || format2 === 'json') {
          return '${' + (variable1 || variable2) + ':doublequote}';
        }
        return match;
      }
    );
    const renderedValues = templateSrv.replace(template, scopedVars, (value: any) => {
      // escape single quotes by pairing them
      const regExp = new RegExp(`'|"`, 'g');
      const replacements = new Map([
        ["'", "''"],
        ['"', '\\"'],
      ]);
      if (isArray(value)) {
        return map(value, (v: string) => `'${replace(v, regExp, function(matched) {return replacements.get(matched) ?? '';})}'`).join(',');
      }

      return typeof value === 'string' ? `'${replace(value, regExp, "''")}'` : value;
    });
    return { ...JSON.parse(renderedValues), expr: templatedQuery.expr };
  }
  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query)).then((response) => {
      return response;
    });
  }
}
