import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rspack } from '@rspack/core';
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
  context?: string
) {
  const fileSystem = memfs.createFsFromVolume(new memfs.Volume());

  const compiler = rspack({
    context: context ?? __dirname,
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

describe('CodeSigningPlugin - public key embedding', () => {
  let tmpDir: string;

  function createTempProjectDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-cs-plugin-'));
    return dir;
  }

  beforeEach(() => {
    tmpDir = createTempProjectDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupNativeFiles(projectRoot: string) {
    const iosAppDir = path.join(projectRoot, 'ios', 'TestApp');
    fs.mkdirSync(iosAppDir, { recursive: true });
    fs.writeFileSync(
      path.join(iosAppDir, 'Info.plist'),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleName</key>
\t<string>TestApp</string>
</dict>
</plist>`
    );

    const androidValuesDir = path.join(
      projectRoot,
      'android',
      'app',
      'src',
      'main',
      'res',
      'values'
    );
    fs.mkdirSync(androidValuesDir, { recursive: true });
    fs.writeFileSync(
      path.join(androidValuesDir, 'strings.xml'),
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">TestApp</string>
</resources>`
    );
  }

  function copyFixtureKeys(projectRoot: string) {
    const fixtureDir = path.join(__dirname, '__fixtures__');
    fs.copyFileSync(
      path.join(fixtureDir, 'testRS256.pem'),
      path.join(projectRoot, 'code-signing.pem')
    );
    fs.copyFileSync(
      path.join(fixtureDir, 'testRS256.pem.pub'),
      path.join(projectRoot, 'code-signing.pem.pub')
    );
  }

  it('does not embed when publicKeyPath is not set', async () => {
    copyFixtureKeys(tmpDir);
    setupNativeFiles(tmpDir);

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
      {
        enabled: true,
        privateKeyPath: path.join(tmpDir, 'code-signing.pem'),
      },
      tmpDir
    );

    const plistContent = fs.readFileSync(
      path.join(tmpDir, 'ios', 'TestApp', 'Info.plist'),
      'utf-8'
    );
    expect(plistContent).not.toContain('RepackPublicKey');

    const stringsContent = fs.readFileSync(
      path.join(
        tmpDir,
        'android',
        'app',
        'src',
        'main',
        'res',
        'values',
        'strings.xml'
      ),
      'utf-8'
    );
    expect(stringsContent).not.toContain('RepackPublicKey');
  });

  it('does not embed when enabled is false', async () => {
    copyFixtureKeys(tmpDir);
    setupNativeFiles(tmpDir);

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
      {
        enabled: false,
        privateKeyPath: path.join(tmpDir, 'code-signing.pem'),
        publicKeyPath: path.join(tmpDir, 'code-signing.pem.pub'),
      },
      tmpDir
    );

    const plistContent = fs.readFileSync(
      path.join(tmpDir, 'ios', 'TestApp', 'Info.plist'),
      'utf-8'
    );
    expect(plistContent).not.toContain('RepackPublicKey');
  });

  it('still signs chunks correctly when publicKeyPath is also provided', async () => {
    copyFixtureKeys(tmpDir);
    setupNativeFiles(tmpDir);

    const publicKey = fs.readFileSync(
      path.join(tmpDir, 'code-signing.pem.pub')
    );

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
      {
        enabled: true,
        privateKeyPath: path.join(tmpDir, 'code-signing.pem'),
        publicKeyPath: path.join(tmpDir, 'code-signing.pem.pub'),
      },
      tmpDir
    );

    const chunkBundle = getBundle('myChunk.chunk.bundle');
    expect(chunkBundle.toString().match(BUNDLE_WITH_JWT_REGEX)).toBeTruthy();

    const token = chunkBundle
      .toString()
      .split('/* RCSSB */')[1]
      .replace(/\0/g, '');

    const payload = jwt.verify(token, publicKey) as jwt.JwtPayload;
    expect(payload).toHaveProperty('hash');
  });

  it('accepts publicKeyPath and nativeProjectPaths in schema validation', () => {
    expect(
      () =>
        new CodeSigningPlugin({
          privateKeyPath: '__fixtures__/testRS256.pem',
          publicKeyPath: '__fixtures__/testRS256.pem.pub',
          nativeProjectPaths: {
            ios: './ios/App/Info.plist',
            android: './android/app/src/main/res/values/strings.xml',
          },
        })
    ).not.toThrow();
  });

  it('rejects invalid nativeProjectPaths schema', () => {
    expect(
      () =>
        new CodeSigningPlugin({
          privateKeyPath: '__fixtures__/testRS256.pem',
          // @ts-expect-error invalid nativeProjectPaths on purpose
          nativeProjectPaths: { web: './web/index.html' },
        })
    ).toThrow(/Invalid configuration object/);
  });
});
