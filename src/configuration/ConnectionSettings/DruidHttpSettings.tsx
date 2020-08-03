import React, { FC, ChangeEvent } from 'react';
import { LegacyForms, FieldSet } from '@grafana/ui';
import { ConnectionSettingsProps } from './types';

const { FormField } = LegacyForms;

export const DruidHttpSettings: FC<ConnectionSettingsProps> = props => {
  const { options, onOptionsChange } = props;
  const { settings } = options;

  const onSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    switch (event.target.name) {
      case 'url': {
        settings.url = value;
        break;
      }
      case 'retryableRetryMax': {
        settings.retryableRetryMax = +value;
        break;
      }
      case 'retryableRetryWaitMin': {
        settings.retryableRetryWaitMin = +value;
        break;
      }
      case 'retryableRetryWaitMax': {
        settings.retryableRetryWaitMax = +value;
        break;
      }
    }
    onOptionsChange({ ...options, settings: settings });
  };

  return (
    <FieldSet label="HTTP">
      <FormField
        label="URL"
        name="url"
        type="url"
        placeholder="http://localhost:8888"
        labelWidth={11}
        inputWidth={20}
        value={settings.url}
        onChange={onSettingChange}
      />
      <FormField
        label="Maximum retry"
        name="retryableRetryMax"
        type="number"
        placeholder="5"
        labelWidth={11}
        inputWidth={20}
        value={settings.retryableRetryMax}
        onChange={onSettingChange}
      />
      <FormField
        label="Retry minimum wait (ms)"
        name="retryableRetryWaitMin"
        type="number"
        placeholder="100"
        labelWidth={11}
        inputWidth={20}
        value={settings.retryableRetryWaitMin}
        onChange={onSettingChange}
      />
      <FormField
        label="Retry maximum wait (ms)"
        name="retryableRetryWaitMax"
        type="number"
        placeholder="3000"
        labelWidth={11}
        inputWidth={20}
        value={settings.retryableRetryWaitMax}
        onChange={onSettingChange}
      />
    </FieldSet>
  );
};
