import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { Map } from './';

export const Lookup = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector {...props} label="Lookup" default={Map} components={{ Map: Map }} />
);
