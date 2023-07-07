import React, { ChangeEvent } from 'react';
import { LegacyForms, FieldSet } from '@grafana/ui';
import { ConnectionSettingsProps } from './types';

const { SecretFormField } = LegacyForms;

export const DruidPolarisAuthSettings = (props: ConnectionSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { settings, secretSettings, secretSettingsFields } = options;

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
    <FieldSet label="Polaris API key">
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
    </FieldSet>
  );
};
