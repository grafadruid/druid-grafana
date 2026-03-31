import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderProps, useScopedQueryBuilderFieldProps, Multiple, Row } from '../abstract';
import { DataSource } from '../datasource';
import { GroupByDimension } from '../dimension';
import { LimitSpec } from '../limitspec';
import { HavingSpec } from '../havingspec';
import { Granularity } from '../granularity';
import { RootFilter } from '../filter';
import { Aggregation } from '../aggregation';
import { PostAggregation } from '../postaggregation';

export const GroupBy = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, GroupBy);
  const scopedComponentProps = useScopedQueryBuilderProps(props, GroupBy);
  return (
    <>
      <DataSource {...scopedComponentProps('dataSource')} inline />
      <Granularity {...scopedComponentProps('granularity')} inline />
      <Row>
        <Multiple
          {...scopedProps('dimensions')}
          label="Dimensions"
          description="The dimensions"
          component={GroupByDimension}
          componentExtraProps={{}}
          inlineItems
        />
      </Row>
      <Row>
        <LimitSpec {...scopedComponentProps('limitSpec')} />
      </Row>
      <HavingSpec {...scopedComponentProps('having')} />
      <Row>
        <RootFilter {...scopedComponentProps('filter')} />
      </Row>
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
    </>
  );
};
GroupBy.queryType = 'groupBy';
GroupBy.fields = [
  'dataSource',
  'dimensions',
  'limitSpec',
  'having',
  'granularity',
  'filter',
  'aggregations',
  'postAggregations',
  'intervals',
];
