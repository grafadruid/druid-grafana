import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { Duration, Period, Simple } from './';

export const Granularity = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    name="Granularity"
    components={{ Duration: Duration, Period: Period, Simple: Simple }}
    queryBuilderProps={props}
  />
);
