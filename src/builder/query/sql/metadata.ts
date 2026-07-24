import { DruidDataSource } from '../../../DruidDataSource';

export interface TableMeta {
  schema: string;
  name: string;
}

export interface ColumnMeta {
  name: string;
  type: string;
}

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; promise: Promise<unknown> }>();

// Caches the in-flight promise (also dedupes concurrent triggers); failures are
// not cached so a transient error doesn't poison completion for the whole TTL.
function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.promise as Promise<T>;
  }
  const promise = fetcher().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

// Exposed for tests to start from a clean slate.
export function clearMetadataCache(): void {
  cache.clear();
}

export const fetchTables = (ds: DruidDataSource): Promise<TableMeta[]> =>
  cached(`${ds.uid}/tables`, () => ds.postResource('metadata/tables', {}) as Promise<TableMeta[]>);

export const fetchColumns = (ds: DruidDataSource, schema: string, table: string): Promise<ColumnMeta[]> =>
  cached(
    `${ds.uid}/columns/${schema}.${table}`,
    () => ds.postResource('metadata/columns', { schema, table }) as Promise<ColumnMeta[]>
  );
