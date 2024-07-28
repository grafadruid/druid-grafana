import React, { useState } from 'react';
import { Alert } from '@grafana/ui';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const None = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, None);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <Alert
            title="None"
            severity="info"
            onRemove={() => {
              setShowInfo(false);
            }}
          >
            No column should be included in the result.
          </Alert>
        </Row>
      )}
    </>
  );
};
None.type = 'none';
None.fields = [] as string[];
