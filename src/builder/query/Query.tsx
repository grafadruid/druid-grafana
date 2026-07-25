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

export const Query = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    {...props}
    label="Query"
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
    // Preselect Sql for a new query; an existing query keeps its own queryType.
    default={Sql}
  />
);
