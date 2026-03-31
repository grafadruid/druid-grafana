import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput, Input, Select } from '../abstract';

export const Default = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Default);
  return (
    <>
      <AutocompleteInput
        {...scopedProps('dimension')}
        label="Dimension"
        description="The dimension name"
        type="dimension"
        datasource={props.datasource}
      />
      <Input
        {...scopedProps('outputName')}
        label="Output name"
        description="The, optionnal, dimension output name"
        type="text"
        omitWhenEmpty
      />
      <Select
        {...scopedProps('outputType')}
        label="Output type"
        description="The output type"
        entries={{ STRING: 'String', LONG: 'Long', FLOAT: 'Float' }}
      />
    </>
  );
};
Default.type = 'default';
Default.fields = ['dimension', 'outputName', 'outputType'];
