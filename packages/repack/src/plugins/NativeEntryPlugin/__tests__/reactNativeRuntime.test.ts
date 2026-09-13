import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ASSET_REGISTRY_REQUEST,
  getReactNativeAssetRegistryAlias,
  getReactNativeDeepImportAliases,
  resolveReactNativePolyfills,
} from '../reactNativeRuntime.js';

const tmpDirs: string[] = [];

function makeTmp(files: Record<string, string>) {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'rn-layout-'))
  );
  tmpDirs.push(dir);
  for (const [rel, contents] of Object.entries(files)) {
    const target = path.join(dir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('resolveReactNativePolyfills', () => {
  it('uses rn-get-polyfills.js when present (React Native <= 0.86)', () => {
    const rn = makeTmp({
      'rn-get-polyfills.js':
        "module.exports = () => [require.resolve('./console.js')];",
      'console.js': '// polyfill',
    });
    // Resolver would fail if consulted; reaching the result proves the shim was used.
    const getPolyfills = resolveReactNativePolyfills(rn, rn, () => {
      throw new Error('resolver should not be called when the shim exists');
    });
    const paths = getPolyfills();
    expect(paths).toHaveLength(1);
    expect(path.basename(paths[0])).toBe('console.js');
  });

  it('resolves @react-native/js-polyfills from the project root', () => {
    const rn = makeTmp({ 'index.js': '' });
    const projectRoot = makeTmp({ 'package.json': '{}' });
    const polyfillsModule = path.join(projectRoot, 'polyfills.js');
    fs.writeFileSync(
      polyfillsModule,
      "module.exports = () => ['/abs/console.js'];"
    );

    const getPolyfills = resolveReactNativePolyfills(
      projectRoot,
      rn,
      (req, paths) => {
        if (req.includes('metro-config')) throw new Error('no metro-config');
        if (req.includes('js-polyfills') && paths.includes(projectRoot)) {
          return polyfillsModule;
        }
        throw new Error('unexpected ' + req);
      }
    );

    expect(getPolyfills()).toEqual(['/abs/console.js']);
  });

  it('falls back through @react-native/metro-config when the project root has no polyfills', () => {
    const rn = makeTmp({ 'index.js': '' });
    const projectRoot = makeTmp({ 'package.json': '{}' });

    const metroPkg = path.join(
      projectRoot,
      'node_modules',
      '@react-native',
      'metro-config',
      'package.json'
    );
    fs.mkdirSync(path.dirname(metroPkg), { recursive: true });
    fs.writeFileSync(metroPkg, '{"name":"@react-native/metro-config"}');
    const metroDir = path.dirname(metroPkg);
    const polyfillsModule = path.join(projectRoot, 'polyfills.js');
    fs.writeFileSync(
      polyfillsModule,
      "module.exports = () => ['/abs/error-guard.js'];"
    );

    let consultedMetro = false;
    const getPolyfills = resolveReactNativePolyfills(
      projectRoot,
      rn,
      (req, paths) => {
        if (req.includes('metro-config')) {
          consultedMetro = true;
          return metroPkg;
        }
        if (req.includes('js-polyfills')) {
          // Resolvable only from metro-config's directory, not the project root.
          if (paths.includes(metroDir)) return polyfillsModule;
          throw new Error('not resolvable from ' + paths.join(','));
        }
        throw new Error('unexpected ' + req);
      }
    );

    expect(consultedMetro).toBe(true);
    expect(getPolyfills()).toEqual(['/abs/error-guard.js']);
  });

  it('throws a descriptive error when nothing resolves', () => {
    const rn = makeTmp({ 'index.js': '' });
    const projectRoot = makeTmp({ 'package.json': '{}' });
    expect(() =>
      resolveReactNativePolyfills(projectRoot, rn, () => {
        throw new Error('cannot resolve');
      })
    ).toThrow(/Unable to locate React Native polyfills/);
  });
});

describe('getReactNativeAssetRegistryAlias', () => {
  it('maps to src/asset-registry on the React Native >= 0.87 layout', () => {
    const rn = makeTmp({ 'src/asset-registry.js': 'module.exports = {};' });
    expect(getReactNativeAssetRegistryAlias(rn)).toEqual({
      [`${ASSET_REGISTRY_REQUEST}$`]: path.join(rn, 'src', 'asset-registry'),
    });
  });

  it('returns null on the React Native <= 0.86 layout (legacy file present)', () => {
    const rn = makeTmp({
      'Libraries/Image/AssetRegistry.js': 'module.exports = {};',
    });
    expect(getReactNativeAssetRegistryAlias(rn)).toBeNull();
  });

  it('returns null when no registry file exists', () => {
    const rn = makeTmp({ 'index.js': '' });
    expect(getReactNativeAssetRegistryAlias(rn)).toBeNull();
  });
});

describe('getReactNativeDeepImportAliases', () => {
  it('remaps react-native/src/private when the exports map drops the wildcards (React Native >= 0.87)', () => {
    const rn = makeTmp({
      'package.json': JSON.stringify({
        exports: {
          '.': './index.js',
          './asset-registry': './src/asset-registry.js',
        },
      }),
      'src/private/featureflags/ReactNativeFeatureFlags.js': '',
    });
    expect(getReactNativeDeepImportAliases(rn)).toEqual({
      'react-native/src/private': path.join(rn, 'src', 'private'),
    });
  });

  it('returns null when the exports map exposes ./src/* (React Native <= 0.86)', () => {
    const rn = makeTmp({
      'package.json': JSON.stringify({
        exports: { './*': './*', './src/*': './src/*' },
      }),
      'src/private/index.js': '',
    });
    expect(getReactNativeDeepImportAliases(rn)).toBeNull();
  });

  it('returns null when the exports map exposes a ./* wildcard', () => {
    const rn = makeTmp({
      'package.json': JSON.stringify({ exports: { './*': './*' } }),
      'src/private/index.js': '',
    });
    expect(getReactNativeDeepImportAliases(rn)).toBeNull();
  });

  it('returns null when React Native declares no exports map', () => {
    const rn = makeTmp({
      'package.json': JSON.stringify({ name: 'react-native' }),
      'src/private/index.js': '',
    });
    expect(getReactNativeDeepImportAliases(rn)).toBeNull();
  });

  it('returns null when src/private does not exist', () => {
    const rn = makeTmp({
      'package.json': JSON.stringify({ exports: { '.': './index.js' } }),
      'index.js': '',
    });
    expect(getReactNativeDeepImportAliases(rn)).toBeNull();
  });
});
