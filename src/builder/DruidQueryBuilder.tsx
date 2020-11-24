import React, { FC } from 'react';

import { Query } from './query';
import { QueryBuilderProps } from './types';

export const DruidQueryBuilder: FC<QueryBuilderProps> = (props: QueryBuilderProps) => {
  return (
    <>
      <Query {...props} />
    </>
  );
};
