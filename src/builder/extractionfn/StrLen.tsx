import React, { useState } from 'react';
import { Alert } from '@grafana/ui';
import { QueryBuilderProps } from '../types';
import { useQueryBuilderAutoSubmit, Row } from '../abstract';

export const StrLen = (props: QueryBuilderProps) => {
  useQueryBuilderAutoSubmit(props, StrLen);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <>
      {showInfo && (
        <Row>
          <Alert
            title="StrLen"
            severity="info"
            onRemove={() => {
              setShowInfo(false);
            }}
          >
            Returns the length of dimension values (as if they were encoded in UTF-16)
          </Alert>
        </Row>
      )}
    </>
  );
};
StrLen.type = 'strlen';
StrLen.fields = [] as string[];
