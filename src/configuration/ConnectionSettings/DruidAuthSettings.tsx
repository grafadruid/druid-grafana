import React, { ChangeEvent } from 'react';
import { css } from '@emotion/css';
import { FieldSet, Field, Switch, RadioButtonGroup } from '@grafana/ui';
import { ConnectionSettingsProps } from './types';
import { DruidBasicAuthSettings, DruidmTLSSettings } from './';

const tokenOptions = [
  {
    label: 'ID token (X-ID-Token)',
    value: 'id' as const,
    description: 'aud = client id; works with pac4j without extra mappers',
  },
  {
    label: 'Access token (Authorization)',
    value: 'access' as const,
    description: 'needs an audience mapper on the Keycloak client',
  },
];

export const DruidAuthSettings = (props: ConnectionSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { settings } = options;

  const isHttps = settings.url !== undefined && settings.url.indexOf('https') !== -1;

  const onSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    switch (event.target.name) {
      case 'basicAuth': {
        settings.basicAuth = event!.currentTarget.checked;
        if (settings.basicAuth) {
          settings.oauthPassThru = false;
        }
        break;
      }
      case 'oauthPassThru': {
        settings.oauthPassThru = event!.currentTarget.checked;
        if (settings.oauthPassThru) {
          settings.basicAuth = false; // mutually exclusive: never fall back to a service account
          settings.oauthPassThruToken = settings.oauthPassThruToken ?? 'id';
        }
        break;
      }
      case 'mTLS': {
        settings.mTLS = event!.currentTarget.checked;
        break;
      }
    }
    onOptionsChange({ ...options, settings: settings });
  };

  const onTokenChange = (value: 'access' | 'id') => {
    onOptionsChange({ ...options, settings: { ...settings, oauthPassThruToken: value } });
  };

  return (
    <>
      <FieldSet
        label="Authentication"
        className={css`
          width: 300px;
        `}
      >
        <Field horizontal label="With basic authentication" description="Enable HTTP Basic authentication">
          <Switch value={settings.basicAuth} name="basicAuth" onChange={onSettingChange} />
        </Field>
        <Field
          horizontal
          label="Forward OAuth identity"
          description="Send the logged-in user's OAuth token to Druid (requires OAuth login in Grafana)"
        >
          <Switch value={settings.oauthPassThru} name="oauthPassThru" onChange={onSettingChange} />
        </Field>
        {settings.oauthPassThru && (
          <Field label="Token to forward">
            <RadioButtonGroup
              options={tokenOptions}
              value={settings.oauthPassThruToken ?? 'id'}
              onChange={onTokenChange}
            />
          </Field>
        )}
        {isHttps && (
            <Field horizontal label="With mTLS" description="Enable mutual TLS authentication">
              <Switch value={settings.mTLS} name="mTLS" onChange={onSettingChange} />
            </Field>
        )}
      </FieldSet>
      {settings.basicAuth && <DruidBasicAuthSettings {...props} />}
      {isHttps && settings.mTLS && <DruidmTLSSettings {...props} />}
    </>
  );
};
