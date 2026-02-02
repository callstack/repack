import fs from 'node:fs';
import type {
  Compiler,
  RuntimeModule as RuntimeModuleType,
} from '@rspack/core';

interface PolyfillsRuntimeModuleConfig {
  polyfillPaths: string[];
}

/**
 * Creates a runtime module that inlines React Native polyfills.
 * Runtime modules are executed before the startup function (__webpack_require__.x),
 * which means they run before Module Federation's embed_federation_runtime wrapper.
 */
export const makePolyfillsRuntimeModule = (
  compiler: Compiler,
  moduleConfig: PolyfillsRuntimeModuleConfig
): RuntimeModuleType => {
  const Template = compiler.webpack.Template;
  const RuntimeModule = compiler.webpack.RuntimeModule;

  const PolyfillsRuntimeModule = class extends RuntimeModule {
    constructor(private config: PolyfillsRuntimeModuleConfig) {
      // Use STAGE_BASIC to ensure polyfills run early among runtime modules
      super('repack/polyfills', RuntimeModule.STAGE_BASIC);
    }

    generate() {
      const polyfillCode = this.config.polyfillPaths.map((polyfillPath) => {
        const content = fs.readFileSync(polyfillPath, 'utf-8');
        return Template.asString([
          `// Polyfill: ${polyfillPath.split('/').pop()}`,
          '(function() {',
          Template.indent(content),
          '})();',
        ]);
      });

      return Template.asString(polyfillCode);
    }
  };

  return new PolyfillsRuntimeModule(moduleConfig);
};
