import React, { ChangeEvent, useEffect } from 'react';
import { FieldSet, Field, Switch } from '@grafana/ui';
import { css } from '@emotion/css';
import { AdhocSettings, AdhocSettingsProps } from './types';

export const DruidAdhocSettings = (props: AdhocSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { settings } = options;

  useEffect(() => {
    if (!('shouldAutocompleteValue' in settings)) {
      settings.shouldAutocompleteValue = true;
    }
    if (!('shouldLimitAutocompleteValue' in settings)) {
      settings.shouldLimitAutocompleteValue = true;
    }
    onOptionsChange({ ...options, settings: settings });
  }, []);

  const onSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    switch (event.target.name as keyof AdhocSettings) {
      case 'shouldAutocompleteValue':
        settings.shouldAutocompleteValue = event.currentTarget.checked;
        break;
      case 'shouldLimitAutocompleteValue':
        settings.shouldLimitAutocompleteValue = event.currentTarget.checked;
        break;
    }
    onOptionsChange({ ...options, settings: settings });
  };

  return (
    <>
      <FieldSet
        label="Autocompletion"
        className={css`
          width: 550px;
        `}
      >
        <Field
          horizontal
          label="Autocomplete values"
          description="Enable autocompletion for adhoc variable values. This can severely impact performance on columns with many distinct values."
        >
          <Switch value={settings.shouldAutocompleteValue} name="shouldAutocompleteValue" onChange={onSettingChange} />
        </Field>
        {settings.shouldAutocompleteValue && (
          <>
            <Field
              horizontal
              label="Limit autocomplte on values"
              description="Limit autocompletion for adhoc variable values to the 1000 most common values. This will decrease the performance loss from autocompleting columns with many distinct values, but will as an effect not autocomplete all values in these columns."
            >
              <Switch
                value={settings.shouldLimitAutocompleteValue}
                name="shouldLimitAutocompleteValue"
                onChange={onSettingChange}
              />
            </Field>
          </>
        )}
      </FieldSet>
    </>
  );
};
