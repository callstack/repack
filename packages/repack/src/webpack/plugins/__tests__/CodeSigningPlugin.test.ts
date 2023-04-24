import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import jwt from 'jsonwebtoken';
import webpack from 'webpack';
import {
  CodeSigningPlugin,
  CodeSigningPluginConfig,
} from '../CodeSigningPlugin';

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  ensureDir: jest.fn(),
  writeFile: jest.fn(),
}));

const BUNDLE_WITH_JWT_REGEX =
  /^(.+)?\/\* RCSSB \*\/(?:[\w-]*\.){2}[\w-]*(\x00)*$/;

const compilerMock = {
  context: __dirname,
  hooks: {
    thisCompilation: {
      tap: jest.fn(),
    },
    afterEmit: {
      tapPromise: jest.fn(),
    },
  },
};

const injectHookMocks = (
  chunks: Record<string, { id: string }>,
  resolve: () => void,
  mainOutputBundleFilename: string = 'index.bundle'
) => {
  compilerMock.hooks.thisCompilation.tap.mockImplementationOnce(
    (_, callback) => {
      callback(
        {
          chunks: Object.entries(chunks).map(([file, { id }]) => ({
            id,
            files: new Set([file]),
          })),
          hooks: {
            afterProcessAssets: { tap: (_, cb) => cb() },
          },
          outputOptions: {
            filename: mainOutputBundleFilename,
          },
        },
        jest.fn()
      );
    }
  );
  compilerMock.hooks.afterEmit.tapPromise.mockImplementationOnce(
    (_, callback) => {
      callback({
        outputOptions: {
          path: path.join(__dirname, '__fixtures__'),
        },
      }).then(resolve);
    }
  );
};

describe('CodeSigningPlugin', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('adds code-signing signatures to chunk files', async () => {
    const chunks = {
      'example.container.bundle': {
        id: 'example_container',
      },
      'example.chunk.bundle': {
        id: 'example_chunk',
      },
    };
    const pluginInstance = new CodeSigningPlugin({
      outputPath: path.join('output', 'signed'),
      privateKeyPath: '__fixtures__/testRS256.pem',
    });

    await new Promise<void>((resolve) => {
      injectHookMocks(chunks, resolve);
      pluginInstance.apply(compilerMock as unknown as webpack.Compiler);
    });

    expect(compilerMock.hooks.thisCompilation.tap).toHaveBeenCalledTimes(1);
    expect(compilerMock.hooks.afterEmit.tapPromise).toHaveBeenCalledTimes(1);

    expect(fs.ensureDir).toHaveBeenCalledTimes(2);
    expect(fs.ensureDir).toHaveBeenCalledWith(path.join('output', 'signed'));

    expect(fs.writeFile).toHaveBeenCalledTimes(2);

    // processing is async so order is random
    const bundle1 = (fs.writeFile as jest.Mock).mock.calls[0][1] as Buffer;
    expect(bundle1.toString().match(BUNDLE_WITH_JWT_REGEX)).toBeTruthy();
    expect(bundle1.byteLength).toBeGreaterThan(1280);

    const bundle2 = (fs.writeFile as jest.Mock).mock.calls[1][1] as Buffer;
    expect(bundle2.toString().match(BUNDLE_WITH_JWT_REGEX)).toBeTruthy();
    expect(bundle2.byteLength).toBeGreaterThan(1280);
  });

  it('produces code-signing-mapping file with valid JWTs', async () => {
    const chunks = {
      'example.container.bundle': {
        id: 'example_container',
      },
      'index.bundle': {
        id: 'index',
      },
    };

    const pluginInstance = new CodeSigningPlugin({
      outputPath: path.join('output', 'signed'),
      privateKeyPath: '__fixtures__/testRS256.pem',
    });

    await new Promise<void>((resolve) => {
      injectHookMocks(chunks, resolve);
      pluginInstance.apply(compilerMock as unknown as webpack.Compiler);
    });

    const publicKey = fs.readFileSync(
      path.join(__dirname, '__fixtures__/testRS256.pem.pub')
    );

    const bundles = (fs.writeFile as jest.Mock).mock.calls.reduce(
      (acc, call) => {
        const jwt = (call[1] as Buffer)
          .toString()
          .split('/* RCSSB */')[1]
          .replace(/\0/g, '');
        acc[path.basename(call[0])] = jwt;
        return acc;
      },
      {}
    );

    let payload: jwt.JwtPayload;
    Object.entries<string>(bundles).forEach(([key, value]) => {
      expect(key in chunks).toBeTruthy();
      expect(() => {
        payload = jwt.verify(value, publicKey) as jwt.JwtPayload;
      }).not.toThrow();
      expect(payload).toHaveProperty('hash');
    });
  });

  it('excludes main output bundle from code-signing', async () => {
    const chunks = {
      'example.container.bundle': {
        id: 'example_container',
      },
      'example.chunk.bundle': {
        id: 'example_chunk',
      },
      'main.bundle': {
        id: 'main',
      },
    };

    const mainOutputBundleFilename = 'main.bundle';
    const pluginInstance = new CodeSigningPlugin({
      outputPath: path.join('output', 'signed'),
      privateKeyPath: '__fixtures__/testRS256.pem',
    });

    await new Promise<void>((resolve) => {
      injectHookMocks(chunks, resolve, mainOutputBundleFilename);
      pluginInstance.apply(compilerMock as unknown as webpack.Compiler);
    });

    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    (fs.writeFile as jest.Mock).mock.calls.forEach((call) => {
      expect(call[0]).not.toEqual(
        path.join(__dirname, 'output', 'signed', mainOutputBundleFilename)
      );
    });
  });

  it('excludes additional chunks specified in config from code-signing', async () => {
    const chunks = {
      'example.container.bundle': {
        id: 'example_container',
      },
      'example.chunk.bundle': {
        id: 'example_chunk',
      },
      'local.chunk.bundle': {
        id: 'local_chunk',
      },
      'main.bundle': {
        id: 'main',
      },
    };

    const pluginInstance = new CodeSigningPlugin({
      outputPath: path.join('output', 'signed'),
      privateKeyPath: '__fixtures__/testRS256.pem',
      excludeChunks: ['local_chunk'],
    });

    await new Promise<void>((resolve) => {
      injectHookMocks(chunks, resolve, 'main.bundle');
      pluginInstance.apply(compilerMock as unknown as webpack.Compiler);
    });

    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    (fs.writeFile as jest.Mock).mock.calls.forEach((call) => {
      expect(call[0]).not.toEqual(
        path.join(__dirname, 'output', 'signed', 'main.bundle')
      );
      expect(call[0]).not.toEqual(
        path.join(__dirname, 'output', 'signed', 'local.chunk.bundle')
      );
    });
  });

  it('throws an error when privateKey is not found', () => {
    expect(() =>
      new CodeSigningPlugin({} as CodeSigningPluginConfig).apply(
        compilerMock as unknown as webpack.Compiler
      )
    ).toThrowError();
  });
});
