export interface AdhocSettings {
  shouldAutocompleteValue?: boolean;
  shouldLimitAutocompleteValue?: boolean;
}

export interface AdhocSettingsOptions {
  settings: AdhocSettings;
}

export interface AdhocSettingsProps {
  options: AdhocSettingsOptions;
  onOptionsChange: (options: AdhocSettingsOptions) => void;
}
