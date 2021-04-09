import { DataSourceInstanceSettings, MetricFindValue } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';
import { cloneDeepWith } from 'lodash';

export class DruidDataSource extends DataSourceWithBackend<DruidQuery, DruidSettings> {
  constructor(instanceSettings: DataSourceInstanceSettings<DruidSettings>) {
    super(instanceSettings);
  }
  applyTemplateVariables(query: DruidQuery) {
    const templateSrv = getTemplateSrv();
    return cloneDeepWith(query, (value, key) => {
      if (typeof value === 'string' && value.indexOf('$') !== -1 && key !== 'expr') {
        return templateSrv.replace(value);
      } else {
        return undefined;
      }
    });
  }
  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query)).then((response) => {
      return response;
    });
  }
}
