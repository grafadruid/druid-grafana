// force timezone to UTC to allow tests to work regardless of local timezone
// generally used by snapshots, but can affect specific tests
process.env.TZ = 'UTC';

const { grafanaESModules, nodeModulesToTransform } = require('./.config/jest/utils');

module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),
  // @grafana/plugin-ui ships ESM and must be transformed alongside the known grafana modules.
  transformIgnorePatterns: [nodeModulesToTransform([...grafanaESModules, '@grafana/plugin-ui'])],
};
