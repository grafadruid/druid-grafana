import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import {
  DatasourceMetadata,
  GroupBy,
  Search,
  SegmentMetadata,
  Sql,
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
        Search: Search,
        SegmentMetadata: SegmentMetadata,
        Sql: Sql,
        Timeseries: Timeseries,
        TopN: TopN,
      }}
    />
  </Row>
);
