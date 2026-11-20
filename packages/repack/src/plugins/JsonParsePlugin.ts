import type { Compiler as RspackCompiler } from '@rspack/core';
import semver from 'semver';
import type { Compiler as WebpackCompiler } from 'webpack';
import { isRspackCompiler } from '../helpers/index.js';

const MIN_RSPACK_VERSION = '1.3.0';
const MIN_WEBPACK_VERSION = '5.99.0';

function getBundlerSupport(compiler: RspackCompiler) {
  const bundler = isRspackCompiler(compiler)
    ? {
        name: 'Rspack',
        version: compiler.webpack.rspackVersion,
        minVersion: MIN_RSPACK_VERSION,
      }
    : {
        name: 'webpack',
        version: (compiler as unknown as WebpackCompiler).webpack.version,
        minVersion: MIN_WEBPACK_VERSION,
      };

  return {
    ...bundler,
    supported: semver.gte(
      semver.coerce(bundler.version) ?? '0.0.0',
      bundler.minVersion
    ),
  };
}

export class JsonParsePlugin {
  constructor(private jsonParse: boolean) {}

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;
    const logger = compiler.getInfrastructureLogger('RepackJsonParsePlugin');

    const generator = compiler.options.module.generator ?? {};
    const jsonGenerator = generator.json ?? {};

    if (jsonGenerator.JSONParse !== undefined) {
      return;
    }

    const bundler = getBundlerSupport(compiler);
    if (!bundler.supported) {
      logger.warn(
        `The jsonParse option needs ${bundler.name} ${bundler.minVersion} or newer ` +
          `(found ${bundler.version}). It will be ignored.`
      );
      return;
    }

    compiler.options.module.generator = {
      ...generator,
      json: { ...jsonGenerator, JSONParse: this.jsonParse },
    };
  }
}
