import React, { ChangeEvent } from 'react';
import { css } from '@emotion/css';
import { FieldSet, Field, Switch } from '@grafana/ui';
import { ConnectionSettingsProps } from './types';
import { DruidBasicAuthSettings, DruidPolarisAuthSettings } from './';

export const DruidAuthSettings = (props: ConnectionSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { settings } = options;

  const onSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    switch (event.target.name) {
      case 'basicAuth': {
        settings.basicAuth = event!.currentTarget.checked;
        break;
      }
      case 'polarisAuth': {
        settings.polarisAuth = event!.currentTarget.checked;
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
        <Field horizontal label="With Polaris authentication" description="Authenticate with a Polaris API key">
          <Switch value={settings.polarisAuth} name="polarisAuth" onChange={onSettingChange} />
        </Field>
      </FieldSet>
      {settings.basicAuth && <DruidBasicAuthSettings {...props} />}

      {settings.polarisAuth && <DruidPolarisAuthSettings {...props} />}
    </>
  );
};
