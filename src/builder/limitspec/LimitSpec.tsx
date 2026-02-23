import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { Default } from './';

export const LimitSpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector {...props} label="LimitSpec" default={Default} components={{ Default: Default }} />
);
