import { DataSourceInstanceSettings, DataQueryRequest, DataQueryResponse, QueryResultMeta } from '@grafana/data';
import { MetricFindValue } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';
import { cloneDeepWith } from 'lodash';
import { Observable } from 'rxjs';

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
  query(request: DataQueryRequest<DruidQuery>): Observable<DataQueryResponse> {
    var response = super.query(request);
    return new Observable<DataQueryResponse>((subscriber) => {
      response.subscribe((next) => {
        next.data.forEach((datum) => {
          if (datum.meta === undefined) {
            datum.meta = {} as QueryResultMeta;
          }
          datum.meta.preferredVisualisationType = 'logs';
        });
        subscriber.next(next);
      });
    });
  }
  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query)).then((response) => {
      return response;
    });
  }
}
