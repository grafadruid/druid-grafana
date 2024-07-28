import React, { useState } from 'react';
import { Alert } from '@grafana/ui';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const False = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, False);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <Alert
            title="False"
            severity="info"
            onRemove={() => {
              setShowInfo(false);
            }}
          >
              The false filter is a filter which matches no value. It can be used to temporarily disable other filters
              without removing the filter.
          </Alert>
        </Row>
      )}
    </>
  );
};
False.type = 'false';
False.fields = [] as string[];
