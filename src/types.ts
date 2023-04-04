import { DataQuery, DataSourceJsonData, MetricFindValue, VariableModel } from '@grafana/data';
import { QuerySettings } from './configuration/QuerySettings/types';
import { ConnectionSettings } from './configuration/ConnectionSettings/types';

//expr is a workaround: https://github.com/grafana/grafana/issues/30013
export interface DruidQuery extends DataQuery {
  builder: any;
  settings: QuerySettings;
  expr: string;
}

export interface DruidSettings extends DataSourceJsonData {
  connection?: ConnectionSettings;
  query?: QuerySettings;
}

export interface DruidSecureSettings {}

export interface AdhocFilter {
  key: string;
  operator: '=' | '!=' | '<' | '>' | '=~' | '!~';
  value: MetricFindValue['value'];
  condition: unknown;
}

export interface AdhocVariableModel extends VariableModel {
  type: 'adhoc';
  id: string;
  datasource: {
    type: string;
    uid: string;
  };
  filters: AdhocFilter[];
  hide: number;
  skipUrlSync: boolean;
  rootStateKey: string;
  global: boolean;
  index: number;
  state: string;
  error: unknown;
  description: unknown;
}
