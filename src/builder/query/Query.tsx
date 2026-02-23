import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import {
  DatasourceMetadata,
  GroupBy,
  Json,
  Scan,
  Search,
  SegmentMetadata,
  Sql,
  TimeBoundary,
  Timeseries,
  TopN,
} from './';

import { Row } from '../abstract';

export const Query = (props: QueryBuilderProps) => (
  <Row>
    <QueryBuilderComponentSelector
      {...props}
      label="Query"
      default={Timeseries}
      components={{
        DatasourceMetadata: DatasourceMetadata,
        GroupBy: GroupBy,
        Json: Json,
        Scan: Scan,
        Search: Search,
        SegmentMetadata: SegmentMetadata,
        Sql: Sql,
        TimeBoundary: TimeBoundary,
        Timeseries: Timeseries,
        TopN: TopN,
      }}
    />
  </Row>
);
