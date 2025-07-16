import React, { ChangeEvent } from 'react';
import { css } from '@emotion/css';
import { FieldSet, Field, Switch } from '@grafana/ui';
import { ConnectionSettingsProps } from './types';
import { DruidBasicAuthSettings, DruidmTLSSettings } from './';

export const DruidAuthSettings = (props: ConnectionSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { settings } = options;

  const isHttps = settings.url !== undefined && settings.url.indexOf('https') !== -1;

  const onSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    switch (event.target.name) {
      case 'basicAuth': {
        settings.basicAuth = event!.currentTarget.checked;
        break;
      }
      case 'mTLS': {
        settings.mTLS = event!.currentTarget.checked;
        break;
      }
    }
    onOptionsChange({ ...options, settings: settings });
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
