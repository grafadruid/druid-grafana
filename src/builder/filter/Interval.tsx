import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, useScopedQueryBuilderProps, Input } from '../abstract';
import { Intervals } from '../querysegmentspec';
import { ExtractionFn } from '../extractionfn';

export const Interval = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Interval);
  const scopedComponentProps = useScopedQueryBuilderProps(props, Interval);
  return (
    <>
      <Input {...scopedProps('dimension')} label="Dimension" description="The dimension name" type="text" />
      <Intervals {...scopedComponentProps('intervals')} />
      <ExtractionFn {...scopedComponentProps('extractionFn')} />
    </>
  );
};
Interval.type = 'interval';
Interval.fields = ['dimension', 'intervals', 'extractionFn'];
