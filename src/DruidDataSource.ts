import { DataSourceInstanceSettings } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';

export class DruidDataSource extends DataSourceWithBackend<DruidQuery, DruidSettings> {
  constructor(instanceSettings: DataSourceInstanceSettings<DruidSettings>) {
    super(instanceSettings);
  }
  applyTemplateVariables(query: DruidQuery) {
    const templateSrv = getTemplateSrv();
    const traverser = (obj: any, handler: (obj: any, prop: string) => void) => {
      for (let prop in obj) {
        handler.apply(this, [obj, prop]);
        if (obj[prop] !== null && typeof obj[prop] === 'object') {
          traverser(obj[prop], handler);
        }
      }
    };
    traverser(query, (obj: any, prop: string) => {
      if (typeof obj[prop] === 'string' && obj[prop].indexOf('$') !== -1) {
        obj[prop] = templateSrv.replace(obj[prop]);
      }
    });
    return query;
  }
}
