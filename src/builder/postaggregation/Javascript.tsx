import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Multiple, Code } from '../abstract';

export const Javascript = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Javascript);
  return (
    <>
      <Input {...scopedProps('name')} label="Name" description="Output name for the value" type="text" />
      <Multiple
        {...scopedProps('fieldNames')}
        label="Fields names"
        description="The post-aggregators fields names"
        component={Input}
        componentExtraProps={{
          label: 'Field name',
          description: 'The field name',
          type: 'text',
        }}
      />
      <Code
        {...scopedProps('function')}
        label="Function"
        description="The javascript function. e.g: function(delta, total) { return 100 * Math.abs(delta) / total; }"
        lang="javascript"
      />
    </>
  );
};
Javascript.type = 'javascript';
Javascript.fields = ['name', 'fieldNames', 'function'];
