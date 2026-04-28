import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';

import grafanaConfig, { type Env } from './.config/webpack/webpack.config';

const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    externals: ['react/jsx-runtime', 'react/jsx-dev-runtime'],
  });
};

export default config;
