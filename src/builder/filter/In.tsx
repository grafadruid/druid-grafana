import React, { useMemo } from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, AutocompleteInput, Multiple, Row } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const In = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, In);
  const dimensionScopedProps = scopedProps('dimension');
  const dimensionName = useMemo(
    () => dimensionScopedProps.options.builder || null,
    [dimensionScopedProps.options.builder]
  );
  return (
    <>
      <AutocompleteInput
        {...dimensionScopedProps}
        label="Dimension"
        description="The dimension name"
        type="dimension"
        datasource={props.datasource}
      />
      <Multiple
        {...scopedProps('values')}
        label="Values"
        description="The values"
        component={AutocompleteInput}
        componentExtraProps={{
          label: 'Value',
          description: 'A value',
          type: 'dimensionValue',
          datasource: props.datasource,
          dimensionName,
          rootBuilder: (props as any).rootBuilder,
          range: (props as any).range,
        }}
        inline
      />
      <ExtractionFn {...scopedProps('extractionFn')} />
    </>
  );
};
In.type = 'in';
In.fields = ['dimension', 'values', 'extractionFn'];
