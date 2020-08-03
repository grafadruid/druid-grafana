import React, { FC } from 'react';
import { DruidQueryContextSettings } from './';
import { QuerySettingsProps } from './types';

export const DruidQueryDefaultSettings: FC<QuerySettingsProps> = props => {
  return <DruidQueryContextSettings {...props} />;
};
