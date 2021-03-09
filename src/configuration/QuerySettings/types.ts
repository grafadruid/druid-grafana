export interface QueryContextParameter {
  name: string;
  value: any;
}

export interface QuerySettings {
  format?: string;
  contextParameters?: QueryContextParameter[];
  hideEmptyColumns?: boolean;
}
export interface QuerySettingsOptions {
  settings: QuerySettings;
}

export interface QuerySettingsProps {
  options: QuerySettingsOptions;
  onOptionsChange: (options: QuerySettingsOptions) => void;
}
