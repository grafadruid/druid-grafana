export interface QueryContextParameter {
  name: string;
  value: any;
}

export interface QuerySettings {
  contextParameters?: QueryContextParameter[];
}
export interface QuerySettingsOptions {
  settings: QuerySettings;
}

export interface QuerySettingsProps {
  options: QuerySettingsOptions;
  onOptionsChange: (options: QuerySettingsOptions) => void;
}
