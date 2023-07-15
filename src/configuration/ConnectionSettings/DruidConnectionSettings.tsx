import React, { useState } from 'react';
import { DruidHttpSettings, DruidAuthSettings, DruidPolarisAuthSettings } from './';
import { ConnectionSettingsProps } from './types';
import { LegacyForms, FieldSet } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

const { Select } = LegacyForms;

export const DruidConnectionSettings = (props: ConnectionSettingsProps) => {
  const connectionMethods: Array<SelectableValue<string>> = [
    { label: 'Druid', value: 'druid' },
    { label: 'Imply Polaris', value: 'imply-polaris' },
  ];
  const [connectionMethod, setConnectionMethod] = useState<SelectableValue<string>>(connectionMethods[0]);

  return (
    <>
      <FieldSet label="Data source">
        <Select
          width={16}
          options={connectionMethods}
          value={connectionMethod}
          onChange={(e) => {
            setConnectionMethod(e);
          }}
        />
      </FieldSet>
      {connectionMethod.value === 'imply-polaris' ? (
        <DruidPolarisAuthSettings {...props} />
      ) : (
        <>
          <DruidHttpSettings {...props} />
          <DruidAuthSettings {...props} />
        </>
      )}
    </>
  );
};
