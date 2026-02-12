import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Multiple } from '../abstract';
import { And } from './And';
import { Filter } from './Filter';

/**
 * Root-level filter used in query types (Timeseries, GroupBy, etc.).
 * Always uses an "and" structure internally; the type selector is hidden in the UI.
 * Users see only the list of filter fields and choose the type for each one.
 */
export const RootFilter = (props: QueryBuilderProps) => {
  const raw = props.options.builder;
  const effectiveBuilder =
    raw == null || raw.type === 'and'
      ? raw ?? { type: 'and', fields: [] }
      : { type: 'and', fields: [raw] };

  const andProps = { ...props, options: { ...props.options, builder: effectiveBuilder } };
  const scopedProps = useScopedQueryBuilderFieldProps(andProps, And);

  return (
    <Multiple
      {...scopedProps('fields')}
      label="Filters"
      description="The filter fields"
      component={Filter}
      componentExtraProps={{}}
    />
  );
};
