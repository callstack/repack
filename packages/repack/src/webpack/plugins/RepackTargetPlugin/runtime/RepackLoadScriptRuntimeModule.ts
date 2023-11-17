import webpack from 'webpack';

export class RepackLoadScriptRuntimeModule extends webpack.RuntimeModule {
  constructor(private chunkId?: string | number) {
    super('repack/load script', webpack.RuntimeModule.STAGE_BASIC);
  }

  generate() {
    return webpack.Template.asString([
      '// A bridge between Webpack runtime and Repack runtime for loading chunks and HMR updates',
      webpack.Template.getFunctionContent(
        require('./implementation/loadScript')
      )
        .replaceAll('$loadScript$', webpack.RuntimeGlobals.loadScript)
        .replaceAll('$caller$', `'${this.chunkId?.toString()}'`),
    ]);
  }
}
