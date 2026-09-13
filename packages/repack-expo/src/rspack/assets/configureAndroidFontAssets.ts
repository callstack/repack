import type { Compiler } from '@rspack/core';

const pluginName = 'RepackExpoAndroidFontAssetsPlugin';
const androidBinaryFontAsset = /^font\/(.+\.(?:otf|ttc|ttf))$/i;

export function configureAndroidFontAssets(
  compiler: Compiler,
  platform: 'android' | 'ios'
): void {
  if (platform !== 'android' || compiler.options.mode !== 'production') {
    return;
  }

  // A real Rspack compiler always exposes this hook. Keeping configuration
  // probes hook-safe lets tooling inspect normalized options without starting
  // a compilation.
  if (!compiler.hooks?.thisCompilation) return;

  compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
    compilation.hooks.processAssets.tap(
      {
        name: pluginName,
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
      },
      () => {
        for (const asset of compilation.getAssets()) {
          const match = androidBinaryFontAsset.exec(asset.name);
          if (!match) continue;

          compilation.renameAsset(asset.name, `raw/${match[1]}`);
        }
      }
    );
  });
}
