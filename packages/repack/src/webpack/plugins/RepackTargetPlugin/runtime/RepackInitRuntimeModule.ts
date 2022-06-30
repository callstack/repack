import webpack from 'webpack';

interface RepackInitRuntimeModuleConfig {
  chunkId: string | number | undefined;
  globalObject: string;
  chunkLoadingGlobal: string;
  hmrEnabled?: boolean;
}

export class RepackInitRuntimeModule extends webpack.RuntimeModule {
  constructor(private config: RepackInitRuntimeModuleConfig) {
    super('repack/init', webpack.RuntimeModule.STAGE_BASIC);
  }

  generate() {
    return webpack.Template.asString([
      '// Repack runtime initialization logic',
      webpack.Template.getFunctionContent(require('./implementation/init'))
        .replaceAll('$hmrEnabled$', `${this.config.hmrEnabled ?? false}`)
        .replaceAll('$chunkId$', `"${this.config.chunkId ?? 'unknown'}"`)
        .replaceAll(
          '$chunkLoadingGlobal$',
          `"${this.config.chunkLoadingGlobal}"`
        )
        .replaceAll('$globalObject$', this.config.globalObject),
    ]);
  }
}
