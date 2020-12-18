import { DataSourceInstanceSettings } from '@grafana/data';
import { MetricFindValue } from '@grafana/data';
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
    let q = deepCopy(query);
    traverser(q, (obj: any, prop: string) => {
      if (typeof obj[prop] === 'string' && obj[prop].indexOf('$') !== -1) {
        obj[prop] = templateSrv.replace(obj[prop]);
      }
    });
    return q;
  }
  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    const q = this.applyTemplateVariables(query);
    return this.postResource('query-variable', q).then(response => {
      return response;
    });
  }
}

export const deepCopy = <T>(target: T): T => {
  if (target === null) {
    return target;
  }
  if (target instanceof Date) {
    return new Date(target.getTime()) as any;
  }
  if (target instanceof Array) {
    const cp = [] as any[];
    (target as any[]).forEach(v => {
      cp.push(v);
    });
    return cp.map((n: any) => deepCopy<any>(n)) as any;
  }
  if (typeof target === 'object' && target !== {}) {
    const cp = { ...(target as { [key: string]: any }) } as { [key: string]: any };
    Object.keys(cp).forEach(k => {
      cp[k] = deepCopy<any>(cp[k]);
    });
    return cp as T;
  }
  return target;
};
