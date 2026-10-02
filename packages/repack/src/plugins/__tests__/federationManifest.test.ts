import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import memfs from 'memfs';
import { DEV_SERVER_ASSET_TYPES } from '../../commands/consts.js';
import {
  applyFederationManifest,
  normalizeFederationManifestOption,
} from '../federationManifest/applyFederationManifest.js';
import { buildFederationManifest } from '../federationManifest/buildFederationManifest.js';
import { detectNativeModules } from '../federationManifest/detectNativeModules.js';
import { buildSharedEntries } from '../federationManifest/shared.js';
import { DEFAULT_MANIFEST_FILENAME } from '../federationManifest/types.js';
import { AssetsCopyProcessor } from '../utils/AssetsCopyProcessor.js';

const FIXTURES_CONTEXT = path.join(
  __dirname,
  '__fixtures__',
  'manifest-context'
);

const pkgResource = (pkg: string, file = 'index.js') =>
  path.join(FIXTURES_CONTEXT, 'node_modules', pkg, file);

class FakeRawSource {
  constructor(public value: string) {}
  source() {
    return this.value;
  }
}

function createFakeCompiler(overrides: Record<string, unknown> = {}) {
  const compilationCallbacks: Array<(compilation: unknown) => void> = [];
  const compiler = {
    context: FIXTURES_CONTEXT,
    options: { name: 'ios', output: { publicPath: 'auto' } },
    hooks: {
      compilation: {
        tap: (_name: string, cb: (compilation: unknown) => void) => {
          compilationCallbacks.push(cb);
        },
      },
    },
    webpack: { sources: { RawSource: FakeRawSource } },
    ...overrides,
  };
  return { compiler, compilationCallbacks };
}

function createFakeCompilation({
  modules = [],
  warnings = [],
  assets = {},
}: {
  modules?: unknown[];
  warnings?: Array<{ message: string }>;
  assets?: Record<string, FakeRawSource>;
} = {}) {
  const afterProcessCallbacks: Array<() => void> = [];
  return {
    modules: new Set(modules),
    warnings,
    hooks: {
      afterProcessAssets: {
        tap: (_name: string, cb: () => void) => afterProcessCallbacks.push(cb),
      },
    },
    getAsset: (name: string) => assets[name],
    emitAsset: (name: string, source: FakeRawSource) => {
      assets[name] = source;
    },
    assets,
    afterProcessCallbacks,
  };
}

/** Run the full tap chain and return emitted assets as parsed JSON. */
function emitManifest(
  compilerParams: Parameters<typeof applyFederationManifest>[1],
  compilationOverrides?: Parameters<typeof createFakeCompilation>[0]
) {
  const { compiler, compilationCallbacks } = createFakeCompiler();
  applyFederationManifest(compiler, compilerParams);
  const compilation = createFakeCompilation(compilationOverrides);
  compilationCallbacks.forEach((cb) => {
    cb(compilation);
  });
  compilation.afterProcessCallbacks.forEach((cb) => {
    cb();
  });
  return {
    assets: compilation.assets as Record<string, FakeRawSource>,
    warnings: compilation.warnings,
  };
}

const baseParams = (
  overrides: Partial<Parameters<typeof applyFederationManifest>[1]> = {}
): Parameters<typeof applyFederationManifest>[1] => ({
  option: true,
  name: 'catalog',
  shared: { react: { singleton: true, eager: true } },
  ...overrides,
});

describe('normalizeFederationManifestOption', () => {
  it('applies defaults for `manifest: true`', () => {
    expect(normalizeFederationManifestOption(true)).toEqual({
      fileName: DEFAULT_MANIFEST_FILENAME,
      filePath: undefined,
      nativeAnalysis: true,
    });
  });

  it('keeps custom values from the object form', () => {
    expect(
      normalizeFederationManifestOption({
        fileName: 'custom.json',
        filePath: 'static',
        nativeAnalysis: false,
      })
    ).toEqual({
      fileName: 'custom.json',
      filePath: 'static',
      nativeAnalysis: false,
    });
  });
});

describe('buildSharedEntries', () => {
  it('resolves installed versions relative to the compiler context', () => {
    expect(
      buildSharedEntries(
        {
          react: { singleton: true, eager: true, requiredVersion: '^18.0.0' },
          'not-installed': { singleton: true },
        },
        FIXTURES_CONTEXT
      )
    ).toEqual([
      {
        name: 'react',
        version: '18.0.0-fixture',
        singleton: true,
        eager: true,
        requiredVersion: '^18.0.0',
      },
      {
        name: 'not-installed',
        version: 'unknown',
        singleton: true,
        eager: false,
        requiredVersion: '*',
      },
    ]);
  });

  it('skips synthetic deep-import sharing keys with a trailing slash', () => {
    const entries = buildSharedEntries(
      {
        react: { singleton: true },
        'react-native/': { singleton: true },
        '@react-native/': { singleton: true },
      },
      FIXTURES_CONTEXT
    );
    expect(entries.map((entry) => entry.name)).toEqual(['react']);
  });

  it('normalizes array configs with string and wrapper entries', () => {
    const entries = buildSharedEntries(
      ['react', { 'react-native': { singleton: true } }],
      FIXTURES_CONTEXT
    );
    expect(entries).toEqual([
      {
        name: 'react',
        version: '18.0.0-fixture',
        singleton: false,
        eager: false,
        requiredVersion: '*',
      },
      {
        name: 'react-native',
        version: '0.0.0-fixture',
        singleton: true,
        eager: false,
        requiredVersion: '*',
      },
    ]);
  });

  it('normalizes @module-federation/sdk shared items with a name property', () => {
    const entries = buildSharedEntries(
      [{ name: 'react', singleton: true, version: '^18.0.0' }],
      FIXTURES_CONTEXT
    );
    expect(entries[0]).toMatchObject({
      name: 'react',
      singleton: true,
      requiredVersion: '^18.0.0',
    });
  });
});

describe('detectNativeModules', () => {
  it('classifies packages by native signals and ignores pure JS packages', () => {
    const result = detectNativeModules({
      modules: [
        { resource: pkgResource('native-ui-lib') },
        { resource: pkgResource('react-native') },
        { resource: pkgResource('@acme/scoped-native') },
        { resource: pkgResource('pure-js-lib') },
        { resource: pkgResource('react') },
        { resource: '/some/project/src/App.js' },
      ],
      warnings: [],
    });

    expect(result).toEqual({
      nativeModules: [
        {
          package: '@acme/scoped-native',
          version: '0.2.0',
          turboModule: false,
          confidence: 'heuristic',
        },
        {
          package: 'native-ui-lib',
          version: '1.2.3',
          modules: ['RNUILib'],
          turboModule: true,
          confidence: 'static',
        },
        {
          package: 'react-native',
          version: '0.0.0-fixture',
          turboModule: false,
          confidence: 'heuristic',
        },
      ],
      dynamicImportDetected: false,
      degraded: false,
    });
  });

  it('flags dynamic imports and downgrades static confidence', () => {
    const result = detectNativeModules({
      modules: [{ resource: pkgResource('native-ui-lib') }],
      warnings: [
        {
          message:
            'Critical dependency: the request of a dependency is an expression',
        },
      ],
    });

    expect(result.dynamicImportDetected).toBe(true);
    expect(result.nativeModules[0].confidence).toBe('heuristic');
  });

  it('degrades to an empty list instead of throwing', () => {
    const explodingModules = {
      [Symbol.iterator]: () => {
        throw new Error('boom');
      },
    };
    const result = detectNativeModules({
      modules: explodingModules as unknown as Iterable<unknown>,
      warnings: [],
    });

    expect(result).toEqual({
      nativeModules: [],
      dynamicImportDetected: false,
      degraded: true,
    });
  });
});

describe('buildFederationManifest', () => {
  const manifestFor = (
    overrides: Partial<Parameters<typeof buildFederationManifest>[0]> = {}
  ) =>
    buildFederationManifest({
      context: FIXTURES_CONTEXT,
      name: 'catalog',
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: false },
      },
      publicPath: 'auto',
      nativeModules: [],
      dynamicImportDetected: false,
      nativeAnalysis: true,
      nativeAnalysisDegraded: false,
      ...overrides,
    });

  it('produces schema v1 with upstream-compatible metadata for a remote', () => {
    const manifest = manifestFor({
      exposes: { './App': './src/App' },
      filename: 'catalog.container.bundle',
    });

    expect(manifest.manifestVersion).toBe(1);
    expect(manifest.id).toBe('catalog');
    expect(manifest.metaData).toMatchObject({
      name: 'catalog',
      globalName: 'catalog',
      type: 'remote',
      remoteEntry: {
        name: 'catalog.container.bundle',
        path: '',
        type: 'var',
      },
      publicPath: 'auto',
    });
    expect(manifest.exposes).toEqual([
      { id: 'catalog:App', name: 'App', path: './App' },
    ]);
  });

  it('omits remoteEntry for a host without exposes', () => {
    const manifest = manifestFor();
    expect(manifest.metaData.type).toBe('host');
    expect(manifest.metaData.remoteEntry).toBeUndefined();
  });

  it('reports resolved shared versions, not the declared star range', () => {
    const manifest = manifestFor();
    expect(manifest.shared).toEqual([
      {
        name: 'react',
        version: '18.0.0-fixture',
        singleton: true,
        eager: true,
        requiredVersion: '*',
      },
      {
        name: 'react-native',
        version: '0.0.0-fixture',
        singleton: true,
        eager: false,
        requiredVersion: '*',
      },
    ]);
  });

  it('normalizes remotes from string, array and keyed-object configs', () => {
    const manifest = manifestFor({
      remotes: {
        app1: 'app1@http://localhost:6789/app1.container.bundle',
        app2: 'app2@dynamic',
      },
    });
    expect(manifest.remotes).toEqual([
      {
        federationContainerName: 'app1',
        moduleName: 'app1',
        alias: 'app1',
        entry: 'http://localhost:6789/app1.container.bundle',
      },
      {
        federationContainerName: 'app2',
        moduleName: 'app2',
        alias: 'app2',
        entry: 'dynamic',
      },
    ]);

    const arrayManifest = manifestFor({
      remotes: ['remote1@dynamic', 'remote2@dynamic'],
    });
    expect(arrayManifest.remotes.map((r) => r.federationContainerName)).toEqual(
      ['remote1', 'remote2']
    );
  });

  it('fills the reactNative block from the compiler context', () => {
    const manifest = manifestFor({
      platform: 'ios',
      nativeModules: [
        {
          package: 'native-ui-lib',
          version: '1.2.3',
          turboModule: true,
          confidence: 'static',
        },
      ],
    });
    expect(manifest.reactNative).toEqual({
      version: '0.0.0-fixture',
      platforms: ['ios'],
      nativeModules: [
        {
          package: 'native-ui-lib',
          version: '1.2.3',
          turboModule: true,
          confidence: 'static',
        },
      ],
      dynamicImportDetected: false,
    });
  });

  it('defaults platforms to ios and android when the compiler name is unknown', () => {
    expect(manifestFor().reactNative.platforms).toEqual(['ios', 'android']);
  });

  it('adds an honest note when the native list may be incomplete', () => {
    expect(
      manifestFor({ dynamicImportDetected: true }).reactNative.note
    ).toMatch(/not guaranteed to be exhaustive/);
    expect(manifestFor({ nativeAnalysis: false }).reactNative.note).toMatch(
      /disabled/
    );
    expect(
      manifestFor({ nativeAnalysisDegraded: true }).reactNative.note
    ).toMatch(/detection failed/);
  });

  it('uses the git sha as buildVersion inside a repo', () => {
    const manifest = manifestFor();
    expect(manifest.metaData.buildInfo).toEqual({
      buildVersion: expect.stringMatching(/^[0-9a-f]{7,40}$/),
      buildName: 'catalog',
    });
  });

  it('falls back to the package version outside a git repo', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-manifest-'));
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'loose', version: '3.2.1' })
      );
      expect(manifestFor({ context: tmpDir }).metaData.buildInfo).toEqual({
        buildVersion: '3.2.1',
        buildName: 'catalog',
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('falls back to unknown when nothing identifies the build', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-manifest-'));
    try {
      expect(manifestFor({ context: tmpDir }).metaData.buildInfo).toEqual({
        buildVersion: 'unknown',
        buildName: 'catalog',
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('applyFederationManifest', () => {
  it('emits the manifest with the default file name', () => {
    const { assets } = emitManifest(baseParams());
    const source = assets[DEFAULT_MANIFEST_FILENAME];
    expect(source).toBeDefined();
    expect(JSON.parse(source.value)).toMatchObject({
      manifestVersion: 1,
      name: 'catalog',
      reactNative: { version: '0.0.0-fixture', platforms: ['ios'] },
    });
  });

  it('honors custom fileName and filePath', () => {
    const { assets } = emitManifest(
      baseParams({ option: { fileName: 'custom.json', filePath: 'static' } })
    );
    expect(assets['static/custom.json']).toBeDefined();
  });

  it('skips emission with a warning when the asset name is taken', () => {
    const { assets, warnings } = emitManifest(baseParams(), {
      assets: { [DEFAULT_MANIFEST_FILENAME]: new FakeRawSource('{}') },
    });
    expect(JSON.parse(assets[DEFAULT_MANIFEST_FILENAME].value)).toEqual({});
    expect(warnings[0].message).toMatch(/already exists/);
  });

  it('degrades to a warning instead of failing the build', () => {
    const { compiler, compilationCallbacks } = createFakeCompiler();
    applyFederationManifest(compiler, baseParams());
    const compilation = createFakeCompilation();
    compilation.emitAsset = () => {
      throw new Error('emit exploded');
    };
    compilationCallbacks.forEach((cb) => {
      cb(compilation);
    });
    expect(() =>
      compilation.afterProcessCallbacks.forEach((cb) => {
        cb();
      })
    ).not.toThrow();
    expect(compilation.warnings[0].message).toMatch(/emit exploded/);
  });

  it('never registers anything beyond compilation/afterProcessAssets', () => {
    const { compiler, compilationCallbacks } = createFakeCompiler();
    applyFederationManifest(compiler, baseParams());
    expect(compilationCallbacks).toHaveLength(1);
    const compilation = createFakeCompilation();
    compilationCallbacks.forEach((cb) => {
      cb(compilation);
    });
    expect(compilation.afterProcessCallbacks).toHaveLength(1);
  });
});

describe('dev-server and output pipeline interactions', () => {
  const name = DEFAULT_MANIFEST_FILENAME;

  it('serves the manifest from the dev server', () => {
    expect(DEV_SERVER_ASSET_TYPES.test(name)).toBe(true);
    expect(DEV_SERVER_ASSET_TYPES.test('some-random-file.txt')).toBe(false);
  });

  it('passes through AssetsCopyProcessor untouched while the chunk manifest is rewritten', async () => {
    const volume = new memfs.Volume();
    const filesystem = memfs.createFsFromVolume(volume);
    const manifestContent = JSON.stringify({
      manifestVersion: 1,
      name: 'catalog',
    });

    volume.fromJSON({
      '/out/index.bundle':
        'console.log(1);\n//# sourceMappingURL=index.bundle.map',
      '/out/index.bundle.map': '{"file":"index.bundle","sources":[]}',
      // ManifestPlugin-style per-chunk manifest, the file AssetsCopyProcessor
      // is built to rewrite
      '/out/index.bundle.json':
        '{"files":["index.bundle"],"auxiliaryFiles":["index.bundle.map"]}',
      // Our federation manifest, worst case: also listed in the chunk's
      // auxiliary files even though compilation-level assets never are
      '/out/repack-federation-manifest.json': manifestContent,
    });

    const processor = new AssetsCopyProcessor(
      {
        platform: 'android',
        outputPath: '/out',
        bundleOutput: '/dest/main.jsbundle',
        bundleOutputDir: '/dest',
        sourcemapOutput: '/dest/main.jsbundle.map',
        assetsDest: '/dest/assets',
        logger: { debug: () => {} },
      },
      filesystem as unknown as typeof fs
    );

    processor.enqueueChunk(
      {
        id: 'main',
        files: ['index.bundle'],
        auxiliaryFiles: [
          'index.bundle.json',
          'index.bundle.map',
          DEFAULT_MANIFEST_FILENAME,
        ],
      } as unknown as Parameters<typeof processor.enqueueChunk>[0],
      { isEntry: true, sourceMapFile: 'index.bundle.map' }
    );
    await Promise.all(processor.execute());

    // The chunk manifest is rewritten for the entry bundle...
    const rewritten = filesystem.readFileSync(
      '/dest/main.jsbundle.json',
      'utf-8'
    );
    expect(rewritten).toContain('main.jsbundle');

    // ...our manifest is only ever copied, byte for byte
    const copied = filesystem.readFileSync(
      `/dest/assets/${DEFAULT_MANIFEST_FILENAME}`,
      'utf-8'
    );
    expect(copied).toBe(manifestContent);
  });
});
