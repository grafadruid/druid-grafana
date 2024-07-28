import React, { useState } from 'react';
import { Alert } from '@grafana/ui';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, Row } from '../abstract';
import { ExtractionFn } from '../extractionfn';

export const Extraction = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Extraction);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <Alert
            title="Deprecated"
            severity="info"
            onRemove={() => {
              setShowInfo(false);
            }}
          >
            <p>
              The extraction filter is now deprecated. The selector filter with an extraction function specified
              provides identical functionality and should be used instead.
            </p>
            <a href="https://druid.apache.org/docs/latest/querying/filters.html#extraction-filter">https://druid.apache.org/docs/latest/querying/filters.html#extraction-filter</a>
          </Alert>
        </Row>
      )}
      <Row>
        <Input {...scopedProps('dimension')} label="Dimension" description="The dimension name" type="text" />
        <Input {...scopedProps('value')} label="Value" description="The dimension value" type="text" />
      </Row>
      <Row>
        <ExtractionFn {...scopedProps('extractionFn')} />
      </Row>
    </>
  );
};
Extraction.type = 'extraction';
Extraction.fields = ['dimension', 'value', 'extractionFn'];
