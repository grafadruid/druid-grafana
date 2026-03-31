import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { Dimension } from '../dimension';

export const RegexFiltered = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, RegexFiltered);
  return (
    <>
        <Dimension {...scopedProps('delegate')} />
        <Input {...scopedProps('pattern')} label="Pattern" description="The regex pattern" type="text" />
    </>
  );
};
RegexFiltered.type = 'regexFiltered';
RegexFiltered.fields = ['delegate', 'pattern'];
