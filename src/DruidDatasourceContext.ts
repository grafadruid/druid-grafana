import { createContext } from 'react';
import { DruidDataSource } from './DruidDataSource';

// Carries the DruidDataSource instance down to builder components (which otherwise
// only receive { options, onOptionsChange }) so SQL completion can fetch metadata.
export const DruidDatasourceContext = createContext<DruidDataSource | undefined>(undefined);
