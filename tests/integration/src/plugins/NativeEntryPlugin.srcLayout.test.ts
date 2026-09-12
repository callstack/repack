import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { plugins } from '@callstack/repack';
import { createFsFromVolume, Volume } from 'memfs';
import { afterEach, describe, expect, it } from 'vitest';
import { createCompiler, createVirtualModulePlugin } from '../helpers.js';

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(_dirname, '__fixtures__', 'react-native-src-layout');
const ASSET_REGISTRY_ALIAS_KEY = 'react-native/Libraries/Image/AssetRegistry$';

let projectRoot: string | undefined;

/**
 * Creates a temporary project root that carries a real `@react-native/js-polyfills`
 * package, mirroring how RN >= 0.87 exposes polyfills only through a package that
 * still depends on js-polyfills (rather than through react-native itself).
 */
function makeProjectRoot() {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'rn87-project-'))
  );
  const pkg = path.join(dir, 'node_modules', '@react-native', 'js-polyfills');
  fs.mkdirSync(pkg, { recursive: true });
  fs.writeFileSync(
    path.join(pkg, 'package.json'),
    JSON.stringify({ name: '@react-native/js-polyfills', main: 'index.js' })
  );
  fs.writeFileSync(
    path.join(pkg, 'index.js'),
    "module.exports = () => [require.resolve('./error-guard.js')];"
  );
  fs.writeFileSync(
    path.join(pkg, 'error-guard.js'),
    'globalThis.__SRC_LAYOUT_POLYFILL__ = true;'
  );
  return dir;
}

afterEach(() => {
  if (projectRoot) {
    fs.rmSync(projectRoot, { recursive: true, force: true });
    projectRoot = undefined;
  }
});

describe('NativeEntryPlugin - React Native 0.87 src layout', () => {
  it('aliases the legacy asset registry request, ahead of a user react-native alias', async () => {
    projectRoot = makeProjectRoot();
    const virtualPlugin = await createVirtualModulePlugin({
      './index.js':
        "var A = require('react-native/Libraries/Image/AssetRegistry');" +
        "globalThis.__APP_REGISTERED__ = A.registerAsset({ name: 'logo' });",
    });

    const compiler = await createCompiler({
      context: projectRoot,
      mode: 'development',
      devtool: false,
      entry: './index.js',
      resolve: {
        alias: { 'react-native': FIXTURE },
      },
      output: { path: '/out' },
      plugins: [new plugins.NativeEntryPlugin({}), virtualPlugin],
    });

    // The specific alias must be injected and ordered before the generic key,
    // otherwise a user `react-native` alias rewrites the request to a path that
    // does not exist on the 0.87 layout before the specific key is consulted.
    const alias = compiler.options.resolve.alias as Record<string, string>;
    const aliasKeys = Object.keys(alias);
    expect(alias[ASSET_REGISTRY_ALIAS_KEY]).toBe(
      path.join(FIXTURE, 'src', 'asset-registry')
    );
    expect(aliasKeys.indexOf(ASSET_REGISTRY_ALIAS_KEY)).toBeLessThan(
      aliasKeys.indexOf('react-native')
    );

    // Run manually: the harness configures no JS loaders, so repack's own runtime
    // entries (InitializeScriptManager/ScriptManager) emit unrelated ESM parse
    // errors, exactly as in NativeEntryPlugin.test.ts. We assert only that nothing
    // related to the asset registry / IncludeModules / polyfills failed to resolve.
    const volume = new Volume();
    // @ts-expect-error memfs is compatible enough with the output filesystem
    compiler.outputFileSystem = createFsFromVolume(volume);
    const stats = await new Promise<any>((resolve, reject) => {
      compiler.run((error, s) => (error ? reject(error) : resolve(s)));
    });

    const messages: string[] = (
      stats.toJson({ errors: true }).errors ?? []
    ).map((e: any) => `${e.message ?? ''}\n${e.details ?? ''}`);
    const offenders = messages.filter((m) =>
      /AssetRegistry|asset-registry|IncludeModules|polyfill/i.test(m)
    );
    expect(offenders).toEqual([]);

    const code = volume.readFileSync('/out/main.js', 'utf-8') as string;
    expect(code).toContain('__SRC_LAYOUT_POLYFILL__');
    expect(code).toContain('__SRC_LAYOUT_INITIALIZE_CORE__');
  });
});
