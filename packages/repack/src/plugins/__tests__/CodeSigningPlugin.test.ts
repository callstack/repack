import fs from 'node:fs';
import path from 'node:path';
import { type Compiler, rspack } from '@rspack/core';
import jwt from 'jsonwebtoken';
import memfs from 'memfs';
import RspackVirtualModulePlugin from 'rspack-plugin-virtual-module';
import {
  CodeSigningPlugin,
  type CodeSigningPluginConfig,
} from '../CodeSigningPlugin/index.js';

const BUNDLE_WITH_JWT_REGEX =
  /^(.+)?\/\* RCSSB \*\/(?:[\w-]*\.){2}[\w-]*(\x00)*$/m;

async function compileBundle(
  outputFilename: string,
  virtualModules: Record<string, string>,
  codeSigningConfig: CodeSigningPluginConfig,
  additionalPlugins: Array<{ apply(compiler: Compiler): void }> = []
) {
  const fileSystem = memfs.createFsFromVolume(new memfs.Volume());

  const compiler = rspack({
    context: __dirname,
    mode: 'production',
    devtool: false,
    entry: 'index.js',
    output: {
      filename: outputFilename,
      path: '/out',
      library: 'Export',
      chunkFilename: '[name].chunk.bundle',
    },
    plugins: [
      new CodeSigningPlugin(codeSigningConfig),
      new RspackVirtualModulePlugin({
        'package.json': '{ "type": "module" }',
        ...virtualModules,
      }),
      ...additionalPlugins,
    ],
  });

  // @ts-expect-error memfs is compatible enough
  compiler.outputFileSystem = fileSystem;

  return await new Promise<{
    fileSystem: typeof memfs.fs;
    getBundle: (name: string) => Buffer;
  }>((resolve, reject) =>
    compiler.run((error) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          fileSystem,
          getBundle: (name: string) =>
            fileSystem.readFileSync(`/out/${name}`) as Buffer,
        });
      }
    })
  );
}

describe('CodeSigningPlugin', () => {
  it('adds code-signing signatures to chunk files', async () => {
    const { getBundle } = await compileBundle(
      'index.bundle',
      {
        'index.js': `
          const chunk = import(/* webpackChunkName: "myChunk" */'./myChunk.js'); 
          chunk.then(console.log);
        `,
        'myChunk.js': `
          export default 'myChunk';
        `,
      },
      { enabled: true, privateKeyPath: '__fixtures__/testRS256.pem' }
    );

    const chunkBundle = getBundle('myChunk.chunk.bundle');
    expect(chunkBundle.toString().match(BUNDLE_WITH_JWT_REGEX)).toBeTruthy();
    expect(chunkBundle.length).toBeGreaterThan(1280);
  });

  it('exposes signed chunk assets to processAssets REPORT (after ANALYSE signing)', async () => {
    const seenBeforeSigning: Record<string, string> = {};
    const seenAtReportStage: Record<string, string> = {};

    const captureAtReportStage = {
      apply(compiler: Compiler) {
        compiler.hooks.thisCompilation.tap(
          'TestReportStageCapture',
          (compilation) => {
            const {
              PROCESS_ASSETS_STAGE_ANALYSE,
              PROCESS_ASSETS_STAGE_REPORT,
            } = compiler.webpack.Compilation;

            /** Immediately before CodeSigningPlugin (ANALYSE / 2000) so content is still unsigned. */
            const beforeSigningStage = PROCESS_ASSETS_STAGE_ANALYSE - 1;

            compilation.hooks.processAssets.tap(
              {
                name: 'TestPreAnalyseCapture',
                stage: beforeSigningStage,
              },
              () => {
                for (const chunk of compilation.chunks) {
                  for (const file of chunk.files) {
                    const asset = compilation.getAsset(file);
                    if (!asset) continue;
                    const raw = asset.source.source();
                    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
                    seenBeforeSigning[file] = buf.toString();
                  }
                }
              }
            );

            compilation.hooks.processAssets.tap(
              {
                name: 'TestReportStageCapture',
                stage: PROCESS_ASSETS_STAGE_REPORT,
              },
              () => {
                for (const chunk of compilation.chunks) {
                  for (const file of chunk.files) {
                    const asset = compilation.getAsset(file);
                    if (!asset) continue;
                    const raw = asset.source.source();
                    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
                    seenAtReportStage[file] = buf.toString();
                  }
                }
              }
            );
          }
        );
      },
    };

    await compileBundle(
      'index.bundle',
      {
        'index.js': `
          const chunk = import(/* webpackChunkName: "myChunk" */'./myChunk.js');
          chunk.then(console.log);
        `,
        'myChunk.js': `
          export default 'myChunk';
        `,
      },
      { enabled: true, privateKeyPath: '__fixtures__/testRS256.pem' },
      [captureAtReportStage]
    );

    const chunkFile = 'myChunk.chunk.bundle';
    const before = seenBeforeSigning[chunkFile];
    const atReport = seenAtReportStage[chunkFile];

    expect(before).toBeDefined();
    expect(atReport).toBeDefined();
    /** Regression guard: signing at ANALYSE must mutate assets before REPORT (not only on emit). */
    expect(before.includes('/* RCSSB */')).toBe(false);
    expect(atReport.includes('/* RCSSB */')).toBe(true);
    expect(atReport.length).toBeGreaterThan(before.length);

    expect(atReport.match(BUNDLE_WITH_JWT_REGEX)).toBeTruthy();
    expect(
      seenAtReportStage['index.bundle']?.match(BUNDLE_WITH_JWT_REGEX)
    ).toBeNull();
  });

  it('produces code-signed bundles with valid JWTs', async () => {
    const publicKey = fs.readFileSync(
      path.join(__dirname, '__fixtures__/testRS256.pem.pub')
    );

    const { getBundle } = await compileBundle(
      'index.bundle',
      {
        'index.js': `
          const signed1 = import(/* webpackChunkName: "firstSignedChunk" */'./firstSignedChunk.js'); 
          signed1.then(console.log);

          const signed2 = import(/* webpackChunkName: "secondSignedChunk" */'./secondSignedChunk.js'); 
          signed2.then(console.log);
        `,
        'firstSignedChunk.js': `
          export default 'firstSignedChunk';
        `,
        'secondSignedChunk.js': `
          export default 'secondSignedChunk';
        `,
      },
      { enabled: true, privateKeyPath: '__fixtures__/testRS256.pem' }
    );

    const bundles = [
      getBundle('firstSignedChunk.chunk.bundle'),
      getBundle('secondSignedChunk.chunk.bundle'),
    ];

    const jwts = bundles.map((content) =>
      content.toString().split('/* RCSSB */')[1].replace(/\0/g, '')
    );

    let payload: jwt.JwtPayload;
    jwts.forEach((bundleJWT) => {
      expect(() => {
        payload = jwt.verify(bundleJWT, publicKey) as jwt.JwtPayload;
      }).not.toThrow();
      expect(payload).toHaveProperty('hash');
    });
  });

  it('skips applying plugin when enabled flag is explicitly set to false', async () => {
    const { getBundle } = await compileBundle(
      'index.bundle',
      {
        'index.js': `
          const chunk = import(/* webpackChunkName: "myChunk" */'./myChunk.js'); 
          chunk.then(console.log);
        `,
        'myChunk.js': `
          export default 'myChunk';
        `,
      },
      { enabled: false, privateKeyPath: '__fixtures__/testRS256.pem' }
    );

    const chunkBundle = getBundle('myChunk.chunk.bundle');
    expect(chunkBundle.toString().match(BUNDLE_WITH_JWT_REGEX)).toBeNull();
  });

  it('excludes main output bundle from code-signing', async () => {
    const { getBundle } = await compileBundle(
      'index.bundle',
      {
        'index.js': `
          const chunk = import(/* webpackChunkName: "myChunk" */'./myChunk.js'); 
          chunk.then(console.log);
        `,
        'myChunk.js': `
          export default 'myChunk';
        `,
      },
      { enabled: true, privateKeyPath: '__fixtures__/testRS256.pem' }
    );

    const mainBundle = getBundle('index.bundle');
    expect(mainBundle.toString().match(BUNDLE_WITH_JWT_REGEX)).toBeNull();
  });

  it('excludes additional chunks specified in config from code-signing', async () => {
    const { getBundle } = await compileBundle(
      'index.bundle',
      {
        'index.js': `
          const chunk = import(/* webpackChunkName: "myChunk" */'./myChunk.js'); 
          chunk.then(console.log);

          const noSign = import(/* webpackChunkName: "noSign" */'./noSign.js');
          noSign.then(console.log);
        `,
        'myChunk.js': `
          export default 'myChunk';
        `,
        'noSign.js': `
          export default 'noSign';
        `,
      },
      {
        enabled: true,
        privateKeyPath: '__fixtures__/testRS256.pem',
        excludeChunks: /noSign/,
      }
    );

    const signedChunk = getBundle('myChunk.chunk.bundle');
    expect(signedChunk.toString().match(BUNDLE_WITH_JWT_REGEX)).toBeTruthy();
    const unsignedChunk = getBundle('noSign.chunk.bundle');
    expect(unsignedChunk.toString().match(BUNDLE_WITH_JWT_REGEX)).toBeNull();
  });

  it('throws an error when privateKey is not found in the filesystem', async () => {
    await expect(
      compileBundle(
        'index.bundle',
        { 'index.js': `var a = 'test';` },
        { enabled: true, privateKeyPath: '__fixtures__/missing.key' }
      )
    ).rejects.toThrow(/ENOENT.*missing\.key/);
  });

  it('throws an error when schema is invalid', async () => {
    await expect(
      compileBundle(
        'index.bundle',
        { 'index.js': `var a = 'test';` },
        // @ts-expect-error invalid config on purpose
        { enabled: true }
      )
    ).rejects.toThrow(/Invalid configuration object/);
  });
});
