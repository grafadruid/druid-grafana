import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Checkbox, Multiple, Row } from '../abstract';
import { Dimension } from './Dimension';

export const ListFiltered = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, ListFiltered);
  return (
    <>
      <Dimension {...scopedProps('delegate')} />
      <Checkbox
          {...scopedProps('isWhitelist')}
          label="Is whitelist?"
          description="Specifies if the filtered dimension spec acts as a whitelist"
        />
      <Row>
        <Multiple
          {...scopedProps('values')}
          label="Values"
          description="List of values"
          component={Input}
          componentExtraProps={{
            label: 'Value',
            description: 'The value',
            type: 'text',
          }}
        />
      </Row>
    </>
  );
};
ListFiltered.type = 'listFiltered';
ListFiltered.fields = ['delegate', 'values', 'isWhitelist'];
