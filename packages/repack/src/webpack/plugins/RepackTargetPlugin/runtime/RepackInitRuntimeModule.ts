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
    const init = require('./implementation/init');
    console.log('DEBUG/init', init);

    const fn = webpack.Template.getFunctionContent(init);
    console.log('DEBUG/fn', fn);

    return webpack.Template.asString([
      '// Repack runtime initialization logic',
      fn
        .replaceAll('$chunkId$', `"${this.chunkId ?? 'unknown'}"`)
        .replaceAll('$chunkLoadingGlobal$', `"${this.chunkLoadingGlobal}"`)
        .replaceAll('$globalObject$', this.globalObject),
    ]);
  }
}
