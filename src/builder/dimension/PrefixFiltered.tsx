import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { Dimension } from '../dimension';

export const PrefixFiltered = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, PrefixFiltered);
  return (
    <>
        <Dimension {...scopedProps('delegate')} />
        <Input {...scopedProps('prefix')} label="Prefix" description="The prefix to use" type="text" />
    </>
  );
};
PrefixFiltered.type = 'prefixFiltered';
PrefixFiltered.fields = ['delegate', 'prefix'];
