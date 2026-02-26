import type {
  Compiler,
  NormalModule,
  RuntimeModule as RuntimeModuleType,
} from '@rspack/core';

interface PolyfillsRuntimeModuleConfig {
  polyfillPaths: string[];
}

/**
 * Runtime module that requires polyfill entry modules before the startup
 * function (__webpack_require__.x), ensuring they run before Module Federation's
 * embed_federation_runtime wrapper. Polyfills go through the normal loader
 * pipeline as entry modules; this module only controls execution timing.
 */
export const makePolyfillsRuntimeModule = (
  compiler: Compiler,
  moduleConfig: PolyfillsRuntimeModuleConfig
): RuntimeModuleType => {
  const Template = compiler.webpack.Template;
  const RuntimeModule = compiler.webpack.RuntimeModule;
  const RuntimeGlobals = compiler.webpack.RuntimeGlobals;

  const PolyfillsRuntimeModule = class extends RuntimeModule {
    constructor(private config: PolyfillsRuntimeModuleConfig) {
      super('repack/polyfills', RuntimeModule.STAGE_BASIC);
    }

    generate() {
      const compilation = this.compilation!;
      const chunk = this.chunk!;
      const chunkGraph = compilation.chunkGraph;
      const chunkModules = new Set(chunkGraph.getChunkModules(chunk));

      const requireCalls = this.config.polyfillPaths
        .map((polyfillPath) => {
          for (const mod of compilation.modules) {
            if ((mod as NormalModule).resource === polyfillPath) {
              if (!chunkModules.has(mod)) return null;
              const moduleId = chunkGraph.getModuleId(mod);
              return `${RuntimeGlobals.require}(${JSON.stringify(moduleId)});`;
            }
          }
          return null;
        })
        .filter(Boolean) as string[];

      return Template.asString(requireCalls);
    }
  };

  return new PolyfillsRuntimeModule(moduleConfig);
};
