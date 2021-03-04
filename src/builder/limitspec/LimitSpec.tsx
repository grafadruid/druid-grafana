import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { Default } from './';

export const LimitSpec = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector name="LimitSpec" components={{ Default: Default }} queryBuilderProps={props} />
);
