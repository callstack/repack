import webpack from 'webpack';

export class RepackInitRuntimeModule extends webpack.RuntimeModule {
  constructor(
    private chunkId: string | number | undefined,
    private globalObject: string,
    private chunkLoadingGlobal: string
  ) {
    super('repack/init', webpack.RuntimeModule.STAGE_BASIC);
  }

  generate() {
    return webpack.Template.asString([
      '// Repack runtime initialization logic',
      webpack.Template.getFunctionContent(require('./implementation/init'))
        .replaceAll('$chunkId$', `"${this.chunkId ?? 'unknown'}"`)
        .replaceAll('$chunkLoadingGlobal$', `"${this.chunkLoadingGlobal}"`)
        .replaceAll('$globalObject$', this.globalObject),
    ]);
  }
}
