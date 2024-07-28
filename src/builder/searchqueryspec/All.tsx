import React, { useState } from 'react';
import { Alert } from '@grafana/ui';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const All = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, All);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <Alert
            title="All"
            severity="info"
            onRemove={() => {
              setShowInfo(false);
            }}
          >
            All. Whatever it does.
          </Alert>
        </Row>
      )}
    </>
  );
};
All.type = 'all';
All.fields = [] as string[];
