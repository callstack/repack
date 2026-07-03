/**
 * Vendored from @rspack/plugin-react-refresh@2.0.2 (client runtime files),
 * which is itself based on @pmmmwh/react-refresh-webpack-plugin.
 *
 * Used by the manual React Refresh wiring in DevelopmentPlugin for
 * webpack and Rspack 1 compilers - under Rspack 2 the official
 * @rspack/plugin-react-refresh plugin provides these files instead.
 *
 * MIT Licensed
 * Copyright (c) 2019 Michael Mok (react-refresh-webpack-plugin)
 * Copyright (c) 2022-present Bytedance, Inc. and its affiliates (rspack-plugin-react-refresh)
 */

import {
  createSignatureFunctionForTransform,
  register,
} from 'react-refresh/runtime';
import { executeRuntime, getModuleExports } from './refreshUtils.js';

function refresh(moduleId, hot) {
  const currentExports = getModuleExports(moduleId);
  const runRefresh = (moduleExports) => {
    const testMode =
      typeof __react_refresh_test__ !== 'undefined'
        ? __react_refresh_test__
        : undefined;
    executeRuntime(moduleExports, moduleId, hot, testMode);
  };
  if (typeof Promise !== 'undefined' && currentExports instanceof Promise) {
    currentExports.then(runRefresh);
  } else {
    runRefresh(currentExports);
  }
}

export { createSignatureFunctionForTransform, refresh, register };
