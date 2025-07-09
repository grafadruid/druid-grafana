import { KeyValue } from '@grafana/data';

export interface ConnectionSettings {
  url?: string;
  retryableRetryMax?: number;
  retryableRetryWaitMin?: number;
  retryableRetryWaitMax?: number;
  basicAuth?: boolean;
  basicAuthUser?: string;
  skipTls?: boolean;
  mTLS?: boolean;
}
export interface ConnectionSecretSettings {
  basicAuthPassword?: string;
  mTLSCert?: string;
  mTLSKey?: string;
  mTLSCa?: string;
}
export interface ConnectionSettingsOptions {
  settings: ConnectionSettings;
  secretSettings: ConnectionSecretSettings;
  secretSettingsFields: KeyValue<boolean>;
}

export interface ConnectionSettingsProps {
  options: ConnectionSettingsOptions;
  onOptionsChange: (options: ConnectionSettingsOptions) => void;
}
