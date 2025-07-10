import React, { ChangeEvent } from 'react';
import {SecretTextArea, FieldSet, Field} from '@grafana/ui';
import { ConnectionSettingsProps } from './types';

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
        ...secretSettingsFields,
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
        <FieldSet label="mTLS Settings">
          <Field
            label="Client Certificate"
          >
            <SecretTextArea
              name="cert"
              type="password"
              placeholder="the client certificate"
              cols={100}
              isConfigured={(secretSettingsFields && secretSettingsFields.mTLSCert) as boolean}
              // @ts-ignore
              onChange={onSecretSettingChange}
              onReset={onCertReset}
            />
          </Field>
          <Field
            label="Client Key"
          >
            <SecretTextArea
              name="key"
              type="password"
              placeholder="the client key"
              cols={100}
              isConfigured={(secretSettingsFields && secretSettingsFields.mTLSKey) as boolean}
              // @ts-ignore
              onChange={onSecretSettingChange}
              onReset={onKeyReset}
            />
          </Field>
          <Field
            label="CA Certificate"
          >
            <SecretTextArea
              name="ca"
              type="password"
              placeholder="the CA certificate"
              cols={100}
              isConfigured={(secretSettingsFields && secretSettingsFields.mTLSCa) as boolean}
              // @ts-ignore
              onChange={onSecretSettingChange}
              onReset={onCaReset}
            />
          </Field>
        </FieldSet>
  );
};
