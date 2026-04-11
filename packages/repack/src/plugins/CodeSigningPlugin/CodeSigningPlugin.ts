import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Compiler as RspackCompiler } from '@rspack/core';
import jwt from 'jsonwebtoken';
import type { Compiler as WebpackCompiler } from 'webpack';
import { type CodeSigningPluginConfig, validateConfig } from './config.js';

export class CodeSigningPlugin {
  constructor(private config: CodeSigningPluginConfig) {
    validateConfig(config);
    this.config.excludeChunks = this.config.excludeChunks ?? [];
  }

  private shouldSignFile(
    file: string,
    mainOutputFilename: string,
    excludedChunks: string[] | RegExp[]
  ): boolean {
    /** Exclude non-chunks & main chunk as it's always local */
    if (file === mainOutputFilename) {
      return false;
    }

    return !excludedChunks.some((chunk) => {
      if (chunk instanceof RegExp) {
        return chunk.test(file);
      }
      return chunk === file;
    });
  }

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    const logger = compiler.getInfrastructureLogger('RepackCodeSigningPlugin');

    if (this.config.enabled === false) {
      return;
    }

    if (typeof compiler.options.output.filename === 'function') {
      throw new Error(
        '[RepackCodeSigningPlugin] Dynamic output filename is not supported. Please use static filename instead.'
      );
    }
    /**
     * Reserve 1280 bytes for the token even if it's smaller
     * to leave some space for future additions to the JWT without breaking compatibility
     */
    const TOKEN_BUFFER_SIZE = 1280;
    /**
     * Used to denote beginning of the code-signing section of the bundle
     * alias for "Repack Code-Signing Signature Begin"
     */
    const BEGIN_CS_MARK = '/* RCSSB */';

    const privateKeyPath = path.isAbsolute(this.config.privateKeyPath)
      ? this.config.privateKeyPath
      : path.resolve(compiler.context, this.config.privateKeyPath);
    const privateKey = fs.readFileSync(privateKeyPath);

    const excludedChunks = Array.isArray(this.config.excludeChunks)
      ? this.config.excludeChunks
      : [this.config.excludeChunks as RegExp];

    compiler.hooks.thisCompilation.tap(
      'RepackCodeSigningPlugin',
      (compilation) => {
        // @ts-ignore — sources is available on both rspack and webpack compilers
        const { sources } = compiler.webpack;
        const mainBundleName = compilation.outputOptions.filename as string;

        compilation.hooks.processAssets.tap(
          {
            name: 'RepackCodeSigningPlugin',
            // Sign at ANALYSE (2000) so assets are signed before any plugin
            // running at REPORT (5000) — e.g. withZephyr() — captures them.
            // The original assetEmitted hook fires after processAssets completes,
            // which is too late when Zephyr uploads assets at REPORT stage.
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
          },
          () => {
            for (const chunk of compilation.chunks) {
              for (const file of chunk.files) {
                if (
                  !this.shouldSignFile(file, mainBundleName, excludedChunks)
                ) {
                  continue;
                }

                const asset = compilation.getAsset(file);
                if (!asset) continue;

                const source = asset.source.source();
                const content = Buffer.isBuffer(source)
                  ? source
                  : Buffer.from(source);

                logger.debug(`Signing ${file}`);
                /** generate bundle hash */
                const hash = crypto
                  .createHash('sha256')
                  .update(content)
                  .digest('hex');
                /** generate token */
                const token = jwt.sign({ hash }, privateKey, {
                  algorithm: 'RS256',
                });
                /** combine the bundle and the token */
                const signedBundle = Buffer.concat(
                  [content, Buffer.from(BEGIN_CS_MARK), Buffer.from(token)],
                  content.length + TOKEN_BUFFER_SIZE
                );

                compilation.updateAsset(
                  file,
                  new sources.RawSource(signedBundle)
                );

                logger.debug(`Signed ${file}`);
              }
            }
          }
        );
      }
    );
  }
}
