import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { Duration, Period, Simple } from './';

export const Granularity = (props: QueryBuilderProps & { inline?: boolean }) => {
  return (
    <QueryBuilderComponentSelector
      {...props}
      label={props.inline ? "Granularity-type" : "Granularity"}
      inline={props.inline}
      components={{ Duration: Duration, Period: Period, Simple: Simple }}
      default={Simple}
      getDefaultBuilder={(componentKey) => (componentKey === 'simple' ? 'day' : undefined)}
    />
  );
};
