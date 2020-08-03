import React, { FC } from 'react';
import { DruidHttpSettings, DruidAuthSettings } from './';
import { ConnectionSettingsProps } from './types';

export const DruidConnectionSettings: FC<ConnectionSettingsProps> = props => {
  return (
    <>
      <DruidHttpSettings {...props} />
      <DruidAuthSettings {...props} />
    </>
  );
};
