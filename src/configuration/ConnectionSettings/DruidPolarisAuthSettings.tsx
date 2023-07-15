import React, { ChangeEvent } from 'react';
import { LegacyForms, FieldSet } from '@grafana/ui';
import { ConnectionSettingsProps } from './types';

const { SecretFormField, FormField } = LegacyForms;

export const DruidPolarisAuthSettings = (props: ConnectionSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { settings, secretSettings, secretSettingsFields } = options;

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

  const onSecretSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    switch (event.target.name) {
      case 'apiKey': {
        settings.basicAuthUser = 'APIKEY';
        secretSettings.basicAuthPassword = value;
        break;
      }
    }
    onOptionsChange({ ...options, secretSettings: secretSettings });
  };
  const onPasswordReset = () => {
    onOptionsChange({
      settings: {
        ...options.settings,
        basicAuthUser: '',
      },
      secretSettingsFields: {
        ...secretSettings,
        basicAuthPassword: false,
      },
      secretSettings: {
        ...secretSettings,
        basicAuthPassword: '',
      },
    });
  };
  return (
    <FieldSet label="API settings">
      <FormField
        label="URL"
        name="url"
        type="url"
        placeholder="https://ORGANIZATION_NAME.api.imply.io"
        labelWidth={11}
        inputWidth={20}
        value={settings.url}
        onChange={onSettingChange}
      />
      <SecretFormField
        label="API key"
        name="apiKey"
        type="text"
        placeholder="pok_abc123....."
        labelWidth={11}
        inputWidth={20}
        isConfigured={(secretSettingsFields && secretSettingsFields.basicAuthPassword) as boolean}
        value={secretSettings.basicAuthPassword || ''}
        onChange={onSecretSettingChange}
        onReset={onPasswordReset}
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
