import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { Map } from './';

export const Lookup = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector name="Lookup" components={{ Map: Map }} queryBuilderProps={props} />
);
