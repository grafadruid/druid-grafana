import React from 'react';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, Input, DateTime, Row } from '../abstract';

export const Duration = (props: QueryBuilderProps & { inline?: boolean }) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Duration);
  const content = (
    <>
      <Input {...scopedProps('duration')} label="Duration" description="The duration in milliseconds" type="number" />
      <DateTime
        {...scopedProps('origin')}
        label="Origin"
        description="Defines where to start counting time buckets from"
        format="MMMM d, yyyy h:mm aa"
        time
      />
    </>
  );
  
  if (props.inline) {
    return content;
  }
  
  return (
    <>
      <Row>
        <Input {...scopedProps('duration')} label="Duration" description="The duration in milliseconds" type="number" />
      </Row>
      <Row>
        <DateTime
          {...scopedProps('origin')}
          label="Origin"
          description="Defines where to start counting time buckets from"
          format="MMMM d, yyyy h:mm aa"
          time
        />
      </Row>
    </>
  );
};
Duration.type = 'duration';
Duration.fields = ['duration', 'origin'];
