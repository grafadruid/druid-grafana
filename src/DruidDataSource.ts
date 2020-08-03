import { DataSourceInstanceSettings } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';

export class DruidDataSource extends DataSourceWithBackend<DruidQuery, DruidSettings> {
  constructor(instanceSettings: DataSourceInstanceSettings<DruidSettings>) {
    super(instanceSettings);
  }
}
