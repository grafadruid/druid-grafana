import React, { FC } from 'react';
import { DruidQueryContextSettings, DruidQueryResponseSettings } from './';
import { QuerySettingsProps } from './types';

export const DruidQuerySettings: FC<QuerySettingsProps> = (props: QuerySettingsProps) => {
  return (
    <>
      <DruidQueryContextSettings {...props} />
      <DruidQueryResponseSettings {...props} />
    </>
  );
};
