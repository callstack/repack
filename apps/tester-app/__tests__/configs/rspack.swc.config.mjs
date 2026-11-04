import * as Repack from '@callstack/repack';
import baseConfig from '../../rspack.config.mjs';

// Same app, but JS goes through the SWC-native rules instead of babel-swc-loader,
// so React Native's own Flow sources are compiled by `getJsTransformRules`
export default (env) => {
  const config = baseConfig(env);
  const assetRules = config.module.rules.filter(
    (rule) => rule.use?.loader !== '@callstack/repack/babel-swc-loader'
  );

  return {
    ...config,
    module: {
      ...config.module,
      rules: [...Repack.getJsTransformRules(), ...assetRules],
    },
    output: {
      ...config.output,
      path: process.env.TEST_WEBPACK_OUTPUT_DIR,
    },
  };
};
