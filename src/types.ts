import { DataQuery, DataSourceJsonData } from '@grafana/data';
import { QuerySettings } from './configuration/QuerySettings/types';
import { ConnectionSettings } from './configuration/ConnectionSettings/types';

export interface DruidQuery extends DataQuery {
  builder: any;
  settings: QuerySettings;
}

//export const DruidDefaultQuery: Partial<DruidQuery> = {
//constant: 6.5,
//};

/**
 * These are options configured for each DataSource instance
 */
export interface DruidSettings extends DataSourceJsonData {
  connection?: ConnectionSettings;
  query?: QuerySettings;
}
export interface DruidSecureSettings {}
