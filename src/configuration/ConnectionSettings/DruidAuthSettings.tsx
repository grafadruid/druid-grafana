import React, { FC, ChangeEvent } from 'react';
import { css } from 'emotion';
import { FieldSet, Field, Switch } from '@grafana/ui';
import { ConnectionSettingsProps } from './types';
import { DruidBasicAuthSettings } from './';

export const DruidAuthSettings: FC<ConnectionSettingsProps> = props => {
  const { options, onOptionsChange } = props;
  const { settings } = options;

  const onSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    settings.basicAuth = event!.currentTarget.checked;
    onOptionsChange({ ...options, settings: settings });
  };

  return (
    <>
      <FieldSet
        label="Authentication"
        className={css`
          width: 250px;
        `}
      >
        <Field horizontal label="With basic authentication" description="Enable HTTP Basic authentication">
          <Switch value={settings.basicAuth} onChange={onSettingChange} />
        </Field>
      </FieldSet>
      {settings.basicAuth && (
        <>
          <DruidBasicAuthSettings {...props} />
        </>
      )}
    </>
  );
};
