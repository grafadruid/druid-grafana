import React, { ChangeEvent } from 'react';
import { LegacyForms, FieldSet } from '@grafana/ui';
import { ConnectionSettingsProps } from './types';

const { SecretFormField } = LegacyForms;

export const DruidmTLSSettings = (props: ConnectionSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { secretSettings, secretSettingsFields } = options;
  const onSecretSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    switch (event.target.name) {
      case 'cert': {
        secretSettings.mTLSCert = value;
        break;
      }
      case 'key': {
        secretSettings.mTLSKey = value;
        break;
      }
      case 'ca': {
        secretSettings.mTLSCa = value;
        break;
      }
    }
    onOptionsChange({ ...options, secretSettings: secretSettings });
  };
  const onCertReset = () => {
    onOptionsChange({
      ...options,
      secretSettingsFields: {
        mTLSCert: false,
      },
      secretSettings: {
        ...secretSettings,
        mTLSCert: '',
      },
    });
  };
  const onKeyReset = () => {
    onOptionsChange({
      ...options,
      secretSettingsFields: {
        ...secretSettingsFields,
        mTLSKey: false,
      },
      secretSettings: {
        ...secretSettings,
        mTLSKey: '',
      },
    });
  };
  const onCaReset = () => {
    onOptionsChange({
      ...options,
      secretSettingsFields: {
        ...secretSettingsFields,
        mTLSCa: false,
      },
      secretSettings: {
        ...secretSettings,
        mTLSCa: '',
      },
    });
  };
  return (
    <FieldSet label="mTLS Authentication">
      <SecretFormField
        label="Client Certificate"
        name="cert"
        type="password"
        placeholder="the client certificate"
        labelWidth={11}
        inputWidth={20}
        isConfigured={(secretSettingsFields && secretSettingsFields.mTLSCert) as boolean}
        value={secretSettings.mTLSCert || ''}
        onChange={onSecretSettingChange}
        onReset={onCertReset}
      />
      <SecretFormField
        label="Client Key"
        name="key"
        type="password"
        placeholder="the client key"
        labelWidth={11}
        inputWidth={20}
        isConfigured={(secretSettingsFields && secretSettingsFields.mTLSKey) as boolean}
        value={secretSettings.mTLSKey || ''}
        onChange={onSecretSettingChange}
        onReset={onKeyReset}
      />
      <SecretFormField
        label="CA Certificate"
        name="ca"
        type="password"
        placeholder="the CA certificate"
        labelWidth={11}
        inputWidth={20}
        isConfigured={(secretSettingsFields && secretSettingsFields.mTLSCa) as boolean}
        value={secretSettings.mTLSCa || ''}
        onChange={onSecretSettingChange}
        onReset={onCaReset}
      />
    </FieldSet>
  );
};
