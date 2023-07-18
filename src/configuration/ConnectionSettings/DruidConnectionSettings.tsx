import React, { useMemo } from 'react';
import { DruidHttpSettings, DruidAuthSettings, ImplyPolarisAuthSettings } from './';
import { ConnectionSettingsProps } from './types';
import { LegacyForms, Field } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from '@emotion/css';

const { Select } = LegacyForms;

type ConnectionMethod = SelectableValue<'druid' | 'imply-polaris'>;

const connectionMethods: ConnectionMethod[] = [
  { label: 'Druid', value: 'druid' },
  { label: 'Imply Polaris', value: 'imply-polaris' },
];

export const DruidConnectionSettings = (props: ConnectionSettingsProps) => {
  const { options, onOptionsChange } = props;
  const { settings } = options;

  const setConnectionMethod = (method: ConnectionMethod) => {
    settings.connectionMethod = method.value;
    onOptionsChange({ ...options, settings });
  };

  const connectionMethod = useMemo(() => {
    return connectionMethods.find((method) => method.value === settings.connectionMethod) || connectionMethods[0];
  }, [settings.connectionMethod]);

  return (
    <>
      <Field
        horizontal
        label="Service type"
        description="Type of Druid instance"
        className={css`
          margin-top: 8px;
          width: 504px;
        `}
      >
        <Select width={20} options={connectionMethods} value={connectionMethod} onChange={setConnectionMethod} />
      </Field>
      {connectionMethod.value === 'imply-polaris' ? (
        <ImplyPolarisAuthSettings {...props} />
      ) : (
        <>
          <DruidHttpSettings {...props} />
          <DruidAuthSettings {...props} />
        </>
      )}
    </>
  );
};
