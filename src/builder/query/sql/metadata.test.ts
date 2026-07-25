import { fetchTables, fetchColumns, clearMetadataCache } from './metadata';
import { DruidDataSource } from '../../../DruidDataSource';

function mockDatasource(uid: string, postResource: jest.Mock): DruidDataSource {
  return { uid, postResource } as unknown as DruidDataSource;
}

describe('metadata cache', () => {
  beforeEach(() => {
    clearMetadataCache();
  });

  it('dedupes calls within the TTL (single postResource call)', async () => {
    const post = jest.fn().mockResolvedValue([{ schema: 'druid', name: 'wikipedia' }]);
    const ds = mockDatasource('uid-a', post);

    const [a, b] = await Promise.all([fetchTables(ds), fetchTables(ds)]);
    await fetchTables(ds);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('metadata/tables', {});
    expect(a).toEqual([{ schema: 'druid', name: 'wikipedia' }]);
    expect(b).toEqual(a);
  });

  it('does not cache failures', async () => {
    const post = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([{ schema: 'druid', name: 'wikipedia' }]);
    const ds = mockDatasource('uid-b', post);

    await expect(fetchTables(ds)).rejects.toThrow('boom');
    await expect(fetchTables(ds)).resolves.toEqual([{ schema: 'druid', name: 'wikipedia' }]);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('isolates cache entries per datasource uid', async () => {
    const postA = jest.fn().mockResolvedValue([{ schema: 'druid', name: 'a' }]);
    const postB = jest.fn().mockResolvedValue([{ schema: 'druid', name: 'b' }]);

    const a = await fetchTables(mockDatasource('uid-1', postA));
    const b = await fetchTables(mockDatasource('uid-2', postB));

    expect(a).toEqual([{ schema: 'druid', name: 'a' }]);
    expect(b).toEqual([{ schema: 'druid', name: 'b' }]);
    expect(postA).toHaveBeenCalledTimes(1);
    expect(postB).toHaveBeenCalledTimes(1);
  });

  it('keys columns by schema and table', async () => {
    const post = jest.fn().mockResolvedValue([{ name: '__time', type: 'TIMESTAMP' }]);
    const ds = mockDatasource('uid-c', post);

    await fetchColumns(ds, 'druid', 'wikipedia');
    await fetchColumns(ds, 'druid', 'wikipedia');
    await fetchColumns(ds, 'sys', 'segments');

    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenNthCalledWith(1, 'metadata/columns', { schema: 'druid', table: 'wikipedia' });
    expect(post).toHaveBeenNthCalledWith(2, 'metadata/columns', { schema: 'sys', table: 'segments' });
  });
});
