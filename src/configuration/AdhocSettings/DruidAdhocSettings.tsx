import React, { ChangeEvent } from 'react';
import { FieldSet, Field, Switch } from '@grafana/ui';
import { css } from '@emotion/css';
import { AdhocSettings, AdhocSettingsProps } from './types';

export const DruidAdhocSettings = (props: AdhocSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { settings } = options;

  const onSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    switch (event.target.name as keyof AdhocSettings) {
      case 'shouldNotAutocompleteValue':
        settings.shouldNotAutocompleteValue = !event.currentTarget.checked;
        break;
      case 'shouldNotLimitAutocompleteValue':
        settings.shouldNotLimitAutocompleteValue = !event.currentTarget.checked;
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
          <Switch value={!settings.shouldNotAutocompleteValue} name="shouldNotAutocompleteValue" onChange={onSettingChange} />
        </Field>
        {!settings.shouldNotAutocompleteValue && (
          <>
            <Field
              horizontal
              label="Limit autocomplte on values"
              description="Limit autocompletion for adhoc variable values to the 1000 most common values. This will decrease the performance loss from autocompleting columns with many distinct values, but will as an effect not autocomplete all values in these columns."
            >
              <Switch
                value={!settings.shouldNotLimitAutocompleteValue}
                name="shouldNotLimitAutocompleteValue"
                onChange={onSettingChange}
              />
            </Field>
          </>
        )}
      </FieldSet>
    </>
  );
};
