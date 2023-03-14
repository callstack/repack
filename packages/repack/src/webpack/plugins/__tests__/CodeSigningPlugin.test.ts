import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import webpack from 'webpack';
import {
  CodeSigningPlugin,
  CodeSigningPluginConfig,
} from '../CodeSigningPlugin';

jest.mock('webpack-sources', () => ({
  RawSource: jest.fn(),
}));

const compilerMock = {
  hooks: {
    thisCompilation: {
      tap: jest.fn(),
    },
  },
};

const emitAssetMock = jest.fn();

const injectThisCompilationHookMock = (
  assets: Record<string, { source: () => Buffer }>
) => {
  compilerMock.hooks.thisCompilation.tap.mockImplementationOnce(
    (_, compilationCB) => {
      compilationCB(
        {
          hooks: {
            processAssets: {
              tap: jest.fn().mockImplementationOnce((_, processAssetsCB) => {
                processAssetsCB(assets);
              }),
            },
          },
          emitAsset: emitAssetMock,
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
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'index.bundle': {
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
    };
    const pluginInstance = new CodeSigningPlugin({
      outputFile: 'custom_code_signing_mapping.json',
      privateKeyPath: path.join(__dirname, '__fixtures__/testRS256.pem'),
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
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
      'index.bundle': {
        source: jest.fn().mockReturnValue(crypto.randomBytes(32)),
      },
    };
    const pluginInstance = new CodeSigningPlugin({
      outputFile: 'code_signing_mapping.json',
      privateKeyPath: path.join(__dirname, '__fixtures__/testRS256.pem'),
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

  it('throws an error when privateKey is not found', () => {
    expect(() =>
      new CodeSigningPlugin({} as CodeSigningPluginConfig).apply(
        compilerMock as unknown as webpack.Compiler
      )
    ).toThrowError();
  });
});
