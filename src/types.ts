import { DataQuery, DataSourceJsonData, DataSourceSettings } from '@grafana/data';
import { QuerySettings, QueryContextParameter } from './configuration/QuerySettings/types';
import { ConnectionSettings } from './configuration/ConnectionSettings/types';

export interface DruidQuery extends DataQuery {
  queryContextParameters?: QueryContextParameter[];
  queryText?: string;
  constant: number;
}

export const DruidDefaultQuery: Partial<DruidQuery> = {
  constant: 6.5,
};

/**
 * These are options configured for each DataSource instance
 */
export interface DruidSettings extends DataSourceJsonData {
  connection?: ConnectionSettings;
  query?: QuerySettings;
}
export interface DruidSecureSettings {}

export interface DataSourceSettingsBaseProps {
  options: DataSourceSettings<DruidSettings, DruidSecureSettings>;
  onOptionsChange: (options: DataSourceSettings) => void;
}
