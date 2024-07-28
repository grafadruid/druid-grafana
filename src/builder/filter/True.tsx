import React, { useState } from 'react';
import { Alert } from '@grafana/ui';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const True = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, True);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <Alert
            title="True"
            severity="info"
            onRemove={() => {
              setShowInfo(false);
            }}
          >
              The true filter is a filter which matches all values. It can be used to temporarily disable other filters
              without removing the filter.
          </Alert>
        </Row>
      )}
    </>
  );
};
True.type = 'true';
True.fields = [] as string[];
