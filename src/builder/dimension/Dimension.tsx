import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { Default, Extraction, ListFiltered, Lookup, RegisteredLookup, PrefixFiltered, RegexFiltered } from './';

export const Dimension = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    name="Dimension"
    components={{
      Default: Default,
      Extraction: Extraction,
      ListFiltered: ListFiltered,
      Lookup: Lookup,
      RegisteredLookup: RegisteredLookup,
      PrefixFiltered: PrefixFiltered,
      RegexFiltered: RegexFiltered,
    }}
    queryBuilderProps={props}
  />
);
