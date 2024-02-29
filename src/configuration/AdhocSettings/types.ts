export interface AdhocSettings {
  shouldNotAutocompleteValue?: boolean;
  shouldNotLimitAutocompleteValue?: boolean;
}

export interface AdhocSettingsOptions {
  settings: AdhocSettings;
}

export interface AdhocSettingsProps {
  options: AdhocSettingsOptions;
  onOptionsChange: (options: AdhocSettingsOptions) => void;
}
