import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Checkbox, Row } from '../abstract';

export const Contains = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Contains);
  return (
    <>
        <Input {...scopedProps('value')} label="Value" description="the value that has to be contained" type="text" />
        <Checkbox
          {...scopedProps('caseSensitive')}
          label="Case sensitive"
          description="Specifies if the match should be case sensitive"
        />
    </>
  );
};
Contains.type = 'contains';
Contains.fields = ['caseSensitive', 'value'];
