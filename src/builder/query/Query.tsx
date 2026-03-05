import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import {
  DatasourceMetadata,
  GroupBy,
  Search,
  SegmentMetadata,
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
        Timeseries: Timeseries,
        TopN: TopN,
      }}
    />
  </Row>
);
