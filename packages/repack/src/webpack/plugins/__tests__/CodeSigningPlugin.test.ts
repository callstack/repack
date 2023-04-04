import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import jwt from 'jsonwebtoken';
import webpack from 'webpack';
import {
  CodeSigningPlugin,
  CodeSigningPluginConfig,
} from '../CodeSigningPlugin';

jest.mock('webpack-sources', () => ({
  RawSource: jest.fn(),
}));

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  ensureDirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const compilerMock = {
  context: __dirname,
  hooks: {
    thisCompilation: {
      tap: jest.fn(),
    },
  },
};

const emitAssetMock = jest.fn();

const injectThisCompilationHookMock = (
  assets: Record<string, { id: string; source: () => Buffer }>,
  mainOutputBundleFilename: string = 'index.bundle'
) => {
  compilerMock.hooks.thisCompilation.tap.mockImplementationOnce(
    (_, compilationCB) => {
      compilationCB(
        {
          chunks: Object.entries(assets).map(([file, { id }]) => ({
            id,
            files: new Set([file]),
          })),
          hooks: {
            afterProcessAssets: {
              tap: jest
                .fn()
                .mockImplementationOnce((_, afterProcessAssetsCB) => {
                  afterProcessAssetsCB(assets);
                }),
            },
          },
          emitAsset: emitAssetMock,
          outputOptions: {
            filename: mainOutputBundleFilename,
          },
        },
        jest.fn()
      );
    }
  );
};

describe('CodeSigningPlugin', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('adds code-signing-mapping file to the sources', () => {
    const assets = {
      'example.container.bundle': {
        id: 'example_container',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'example.chunk.bundle': {
        id: 'example_chunk',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
    };
    const pluginInstance = new CodeSigningPlugin({
      outputFile: 'custom_code_signing_mapping.json',
      privateKeyPath: '__fixtures__/testRS256.pem',
    });
    injectThisCompilationHookMock(assets);

    pluginInstance.apply(compilerMock as unknown as webpack.Compiler);
    expect(compilerMock.hooks.thisCompilation.tap).toHaveBeenCalledTimes(1);
    expect(webpack.sources.RawSource).toHaveBeenCalledTimes(1);
    expect(emitAssetMock).toHaveBeenCalledTimes(1);
    expect(emitAssetMock).toHaveBeenCalledWith(
      'custom_code_signing_mapping.json',
      expect.anything()
    );
  });

  it('produces code-signing-mapping file with valid JWTs', () => {
    const assets = {
      'example.container.bundle': {
        id: 'example_container',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'index.bundle': {
        id: 'index',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
    };
    const pluginInstance = new CodeSigningPlugin({
      outputFile: 'code_signing_mapping.json',
      privateKeyPath: '__fixtures__/testRS256.pem',
    });
    injectThisCompilationHookMock(assets);

    pluginInstance.apply(compilerMock as unknown as webpack.Compiler);

    const mappingFile = JSON.parse(
      (webpack.sources.RawSource as jest.Mock).mock.calls[0][0]
    );
    const publicKey = fs.readFileSync(
      path.join(__dirname, '__fixtures__/testRS256.pem.pub')
    );

    let payload: jwt.JwtPayload;
    Object.entries<string>(mappingFile).forEach(([key, value]) => {
      expect(key in assets).toBeTruthy();
      expect(() => {
        payload = jwt.verify(value, publicKey) as jwt.JwtPayload;
      }).not.toThrow();
      expect(payload).toHaveProperty('hash');
    });
  });

  it('excludes main output bundle from code-signing', () => {
    const assets = {
      'example.container.bundle': {
        id: 'example_container',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'example.chunk.bundle': {
        id: 'example_chunk',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'main.bundle': {
        id: 'main',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
    };
    const pluginInstance = new CodeSigningPlugin({
      outputFile: 'custom_code_signing_mapping.json',
      privateKeyPath: '__fixtures__/testRS256.pem',
    });
    const mainOutputBundleFilename = 'main.bundle';
    injectThisCompilationHookMock(assets, mainOutputBundleFilename);

    pluginInstance.apply(compilerMock as unknown as webpack.Compiler);

    const mappingFile = JSON.parse(
      (webpack.sources.RawSource as jest.Mock).mock.calls[0][0]
    );
    expect(mainOutputBundleFilename in mappingFile).toBeFalsy();
    expect(Object.keys(mappingFile)).toHaveLength(2);
  });

  it('excludes additional chunks specified in config from code-signing', () => {
    const assets = {
      'example.container.bundle': {
        id: 'example_container',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'example.chunk.bundle': {
        id: 'example_chunk',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'local.chunk.bundle': {
        id: 'local_chunk',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'index.bundle': {
        id: 'index',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
    };
    const pluginInstance = new CodeSigningPlugin({
      outputFile: 'code_signing_mapping.json',
      privateKeyPath: '__fixtures__/testRS256.pem',
      excludeChunks: ['local_chunk'],
    });
    injectThisCompilationHookMock(assets);

    pluginInstance.apply(compilerMock as unknown as webpack.Compiler);

    const mappingFile = JSON.parse(
      (webpack.sources.RawSource as jest.Mock).mock.calls[0][0]
    );
    expect(Object.keys(mappingFile)).toHaveLength(2);
    expect('index.bundle' in mappingFile).toBeFalsy();
    expect('local.chunk.bundle' in mappingFile).toBeFalsy();
  });

  it('outputs the mapping file in a custom directory', () => {
    const assets = {
      'example.container.bundle': {
        id: 'example_container',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'index.bundle': {
        id: 'index',
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
    };
    const pluginInstance = new CodeSigningPlugin({
      outputFile: 'code_signing_mapping.json',
      outputPath: 'build/outputs/ios/remote',
      privateKeyPath: '__fixtures__/testRS256.pem',
    });
    injectThisCompilationHookMock(assets);

    pluginInstance.apply(compilerMock as unknown as webpack.Compiler);

    expect(fs.ensureDirSync).toHaveBeenCalledWith('build/outputs/ios/remote');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(
        __dirname,
        'build/outputs/ios/remote/code_signing_mapping.json'
      ),
      expect.stringContaining('example.container.bundle')
    );
  });

  it('throws an error when privateKey is not found', () => {
    expect(() =>
      new CodeSigningPlugin({} as CodeSigningPluginConfig).apply(
        compilerMock as unknown as webpack.Compiler
      )
    ).toThrowError();
  });
});
