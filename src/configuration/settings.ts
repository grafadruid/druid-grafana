export function normalizeData(data: Record<string, any>, namespaced: boolean, namespace: string): object {
  const keyPrefix = namespace + '.';
  const keys = Object.keys(data).filter((key) => {
    if (namespaced) {
      return !key.includes('.');
    } else {
      return key.startsWith(keyPrefix);
    }
  });
  if (keys.length === 0) {
    return {};
  }
  return keys
    .map((key, index) => {
      let newKey: string = keyPrefix + key;
      if (!namespaced) {
        newKey = key.replace(keyPrefix, '');
      }
      return { [newKey]: data[key] };
    })
    .reduce((acc, item) => {
      return { ...acc, ...item };
    });
};
