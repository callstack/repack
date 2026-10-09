import { RepackPlugin, type RepackPluginConfig } from '@callstack/repack';
import { ExpoModulesPlugin as RepackExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';
import type { Compiler } from '@rspack/core';
import { configureAndroidFontAssets } from './assets/configureAndroidFontAssets.js';
import { configureExpoAssets } from './assets/configureExpoAssets.js';
import { configureExpoBabelLoaders } from './babel/configureExpoBabelLoaders.js';
import { createExpoBabelCaller } from './babel/createExpoBabelCaller.js';
import { ExpoPluginError } from './ExpoPluginError.js';
import { configureExpoCompilerEntry } from './entry/configureExpoCompilerEntry.js';
import {
  type ExpoNativePlatform,
  resolveExpoEntry,
} from './entry/resolveExpoEntry.js';
import { configureExpoPublicEnvironment } from './environment/configureExpoPublicEnvironment.js';
import { configureExpoChunkFilename } from './output/configureExpoChunkFilename.js';
import { configureExpoModuleResolution } from './resolve/configureExpoModuleResolution.js';
import { configureExpoResolveOptions } from './resolve/configureExpoResolveOptions.js';
import { configureReactNativeResolution } from './resolve/configureReactNativeResolution.js';
import { configureExpoRouterEntry } from './router/configureExpoRouterEntry.js';
import { resolveRouterRoot } from './router/resolveRouterRoot.js';
import { applyRepackSourceMapFix } from './source-map/applyRepackSourceMapFix.js';

export type ExpoPluginOptions = {
  /** Override package.json#main for this compilation. */
  entry?: string;
  /** Target native platform. Defaults to the Rspack configuration name. */
  platform?: ExpoNativePlatform;
  /** Expo application root. Defaults to the Rspack context. */
  projectRoot?: string;
  /** Configure the RepackPlugin instance owned by ExpoPlugin. */
  repack?: RepackPluginConfig;
  /** Expo Router application directory. Defaults to src/app when present, then app. */
  routerRoot?: string;
};

function hasPlugin(compiler: Compiler, name: string): boolean {
  return (compiler.options.plugins ?? []).some(
    (plugin) =>
      typeof plugin === 'object' &&
      plugin !== null &&
      plugin.constructor?.name === name
  );
}

function resolvePlatform(
  compiler: Compiler,
  configuredPlatform?: ExpoNativePlatform
): ExpoNativePlatform {
  const platform = configuredPlatform ?? compiler.options.name;
  if (platform !== 'ios' && platform !== 'android') {
    throw new ExpoPluginError({
      code: 'UNSUPPORTED_PLATFORM',
      message: `ExpoPlugin requires an ios or android Rspack compilation, received ${String(platform)}.`,
      recovery:
        'Set the Rspack configuration name or ExpoPlugin.platform to ios or android.',
    });
  }
  return platform;
}

function assertRspack(compiler: Compiler): void {
  if (!('rspackVersion' in compiler.webpack)) {
    throw new ExpoPluginError({
      code: 'RSPACK_REQUIRED',
      message: 'ExpoPlugin v1 supports Rspack only.',
      recovery: 'Use Re.Pack with @rspack/core instead of Webpack.',
    });
  }
}

function assertNativeClient(compiler: Compiler): void {
  const presets = compiler.options.externalsPresets;
  if (presets.node || presets.electron || presets.electronMain) {
    throw new ExpoPluginError({
      code: 'UNSUPPORTED_ENVIRONMENT',
      message: 'ExpoPlugin v1 supports native client compilations only.',
      recovery:
        'Remove the Node/Electron target and configure a separate Rspack build for server or RSC code.',
    });
  }
}

class ExpoModulesPlugin {
  constructor(private options: ExpoPluginOptions = {}) {}

  private createRepackPlugin(platform: ExpoNativePlatform): RepackPlugin {
    const repack = this.options.repack ?? {};
    if (repack.platform !== undefined && repack.platform !== platform) {
      throw new ExpoPluginError({
        code: 'REPACK_PLATFORM_CONFLICT',
        message: `ExpoPlugin resolved platform ${platform}, but repack.platform is ${repack.platform}.`,
        recovery:
          'Remove repack.platform or set it to the same platform as ExpoPlugin.',
      });
    }

    return new RepackPlugin({
      ...repack,
      extraChunks: repack.extraChunks ?? [{ type: 'local' }],
      platform,
    });
  }

  apply(compiler: Compiler): void {
    assertRspack(compiler);
    assertNativeClient(compiler);

    if (hasPlugin(compiler, 'RepackPlugin')) {
      throw new ExpoPluginError({
        code: 'REPACK_PLUGIN_CONFLICT',
        message:
          'ExpoPlugin configures RepackPlugin internally and cannot be combined with a separate RepackPlugin.',
        recovery:
          'Remove RepackPlugin from the Expo Rspack configuration. Configure Expo through ExpoPlugin only.',
      });
    }

    const platform = resolvePlatform(compiler, this.options.platform);
    const resolvedEntry = resolveExpoEntry({
      entry: this.options.entry,
      from: compiler.context,
      platform,
      projectRoot: this.options.projectRoot,
    });
    const routerRoot = resolveRouterRoot(
      resolvedEntry.projectRoot,
      this.options.routerRoot
    );
    const publicEnvironment = configureExpoPublicEnvironment(
      compiler,
      resolvedEntry.projectRoot
    );
    const caller = createExpoBabelCaller({
      isDev: compiler.options.mode === 'development',
      platform,
      projectRoot: resolvedEntry.projectRoot,
      routerRoot,
    });
    configureExpoBabelLoaders(
      compiler.options.module.rules,
      caller,
      {
        babel: require.resolve('./loaders/expoBabelLoader.js'),
      },
      publicEnvironment
    );

    configureExpoAssets(
      compiler.options.module.rules,
      require.resolve('@callstack/repack/assets-loader'),
      platform
    );
    configureAndroidFontAssets(compiler, platform);
    configureExpoRouterEntry(
      compiler.options.module.rules,
      resolvedEntry,
      require.resolve('./loaders/expoRouterEntryLoader.js')
    );

    configureExpoResolveOptions(compiler.options.resolve, platform);
    compiler.options.resolve.modules = configureExpoModuleResolution(
      compiler.options.resolve.modules,
      resolvedEntry.projectRoot
    );
    compiler.options.resolve.alias = configureReactNativeResolution(
      compiler.options.resolve.alias,
      resolvedEntry.projectRoot
    );

    configureExpoChunkFilename(compiler.options.output);

    compiler.options.entry = configureExpoCompilerEntry(
      compiler.options.entry,
      resolvedEntry.entryPath,
      require.resolve('./runtime/configureScriptManager.js')
    );

    applyRepackSourceMapFix(compiler, this.createRepackPlugin(platform));
    new RepackExpoModulesPlugin({ platform }).apply(compiler);
  }
}

// Re.Pack's CLI detects required integration plugins by constructor name.
// Exporting the enhanced ExpoModulesPlugin under the public ExpoPlugin name
// keeps that validation accurate without changing Re.Pack's core packages.
export { ExpoModulesPlugin as ExpoPlugin };
