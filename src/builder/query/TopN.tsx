import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderProps, useScopedQueryBuilderFieldProps, Multiple, Input, Row } from '../abstract';
import { DataSource } from '../datasource';
import { Granularity } from '../granularity';
import { RootFilter } from '../filter';
import { Aggregation } from '../aggregation';
import { PostAggregation } from '../postaggregation';
import { Dimension } from '../dimension';
import { TopNMetric } from '../topnmetric';

export const TopN = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, TopN);
  const scopedComponentProps = useScopedQueryBuilderProps(props, TopN);
  return (
    <>
        <DataSource {...scopedComponentProps('dataSource')} inline />
        <Granularity {...scopedComponentProps('granularity')} inline />
      <Row>
        <RootFilter {...scopedComponentProps('filter')} />
      </Row>
      <Row>
        <Multiple
          {...scopedProps('aggregations')}
          label="Aggregations"
          description="The aggregations"
          component={Aggregation}
          componentExtraProps={{
            label: 'Aggregation',
            description: 'An aggregation',
          }}
        />
      </Row>
      <Row>
        <Multiple
          {...scopedProps('postAggregations')}
          label="Post-aggregations"
          description="The post-aggregations"
          component={PostAggregation}
          componentExtraProps={{
            label: 'Post-aggregation',
            description: 'A post-aggregation',
          }}
        />
      </Row>
      <Row>
        <Dimension {...scopedProps('dimension')} />
      </Row>
      <Row>
        <TopNMetric {...scopedProps('metric')} />
        <Input
          {...scopedProps('threshold')}
          label="Threshold"
          description="How many results in the top list"
          type="number"
          omitWhenEmpty
        />
      </Row>
    </>
  );
};
TopN.queryType = 'topN';
TopN.fields = [
  'dataSource',
  'intervals',
  'granularity',
  'filter',
  'aggregations',
  'postAggregations',
  'dimension',
  'threshold',
  'metric',
];
