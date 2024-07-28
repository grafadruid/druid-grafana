import React, { useState } from 'react';
import { Alert } from '@grafana/ui';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const Identity = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, Identity);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <Alert
            title="Identity"
            severity="info"
            onRemove={() => {
              setShowInfo(false);
            }}
          >
            Identity. Whatever it does.
          </Alert>
        </Row>
      )}
    </>
  );
};
Identity.type = 'identity';
Identity.fields = [] as string[];
