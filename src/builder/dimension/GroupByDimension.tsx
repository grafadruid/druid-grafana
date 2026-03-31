import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput } from '../abstract';
import { Default } from './Default';

/** Group-by only: default dimension spec, single field (name), no type selector. */
export const GroupByDimension = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Default);
  return (
    <AutocompleteInput
      {...scopedProps('dimension')}
      label="Dimension name"
      description="The dimension name"
      type="dimension"
      datasource={props.datasource}
    />
  );
};
