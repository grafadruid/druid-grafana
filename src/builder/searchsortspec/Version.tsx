import React from 'react';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit } from '../abstract';

export const Version = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Version);
  return null;
};
Version.type = 'version';
Version.fields = [] as string[];
