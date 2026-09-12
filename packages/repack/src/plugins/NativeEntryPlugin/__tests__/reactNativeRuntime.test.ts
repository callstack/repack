import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ASSET_REGISTRY_REQUEST,
  getReactNativeAssetRegistryAlias,
  resolveReactNativePolyfills,
} from '../reactNativeRuntime.js';

function makeTmpRn(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-layout-'));
  for (const [rel, contents] of Object.entries(files)) {
    const target = path.join(dir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  return dir;
}

describe('resolveReactNativePolyfills', () => {
  it('uses rn-get-polyfills.js when present (React Native <= 0.86)', () => {
    const rn = makeTmpRn({
      'rn-get-polyfills.js':
        "module.exports = () => [require.resolve('./console.js')];",
      'console.js': '// polyfill',
    });
    const getPolyfills = resolveReactNativePolyfills(rn, rn);
    expect(typeof getPolyfills).toBe('function');
    const paths = getPolyfills();
    expect(Array.isArray(paths)).toBe(true);
    expect(paths).toHaveLength(1);
    expect(path.basename(paths[0])).toBe('console.js');
  });

  it('falls back to @react-native/js-polyfills when rn-get-polyfills.js is absent', () => {
    // React Native >= 0.87 layout: no rn-get-polyfills.js. Resolution of
    // `@react-native/js-polyfills` is delegated to require.resolve, so under the
    // test harness it resolves from the installed tree. We only assert the
    // documented contract: a function returning an array of absolute paths.
    const rn = makeTmpRn({ 'index.js': '' });
    const getPolyfills = resolveReactNativePolyfills(rn, rn);
    expect(typeof getPolyfills).toBe('function');
    const paths = getPolyfills();
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.every((p) => path.isAbsolute(p))).toBe(true);
  });
});

describe('getReactNativeAssetRegistryAlias', () => {
  it('maps to src/asset-registry on React Native >= 0.87 layout', () => {
    const rn = makeTmpRn({
      'src/asset-registry.js': 'module.exports = {};',
    });
    const alias = getReactNativeAssetRegistryAlias(rn);
    expect(alias).toEqual({
      [`${ASSET_REGISTRY_REQUEST}$`]: path.join(rn, 'src', 'asset-registry'),
    });
  });

  it('maps to Libraries/Image/AssetRegistry on React Native <= 0.86 layout', () => {
    const rn = makeTmpRn({
      'Libraries/Image/AssetRegistry.js': 'module.exports = {};',
    });
    const alias = getReactNativeAssetRegistryAlias(rn);
    expect(alias).toEqual({
      [`${ASSET_REGISTRY_REQUEST}$`]: path.join(
        rn,
        'Libraries',
        'Image',
        'AssetRegistry'
      ),
    });
  });

  it('prefers the modern layout when both are present', () => {
    const rn = makeTmpRn({
      'src/asset-registry.js': 'module.exports = {};',
      'Libraries/Image/AssetRegistry.js': 'module.exports = {};',
    });
    const alias = getReactNativeAssetRegistryAlias(rn);
    expect(alias?.[`${ASSET_REGISTRY_REQUEST}$`]).toBe(
      path.join(rn, 'src', 'asset-registry')
    );
  });

  it('returns null when no registry file exists (test fixtures)', () => {
    const rn = makeTmpRn({ 'index.js': '' });
    expect(getReactNativeAssetRegistryAlias(rn)).toBeNull();
  });
});
