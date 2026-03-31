import React from 'react';
import { QueryBuilderProps } from '../types';
import { QueryBuilderComponentSelector } from '../abstract';
import { Default, Extraction, ListFiltered, Lookup, RegisteredLookup, PrefixFiltered, RegexFiltered } from './';

export const Dimension = (props: QueryBuilderProps) => (
  <QueryBuilderComponentSelector
    {...props}
    label="Dimension"
    default={Default}
    inline
    components={{
      Default: Default,
      Extraction: Extraction,
      ListFiltered: ListFiltered,
      Lookup: Lookup,
      RegisteredLookup: RegisteredLookup,
      PrefixFiltered: PrefixFiltered,
      RegexFiltered: RegexFiltered,
    }}
  />
);
