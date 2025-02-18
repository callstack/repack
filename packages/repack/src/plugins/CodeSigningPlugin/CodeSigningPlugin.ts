import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import type { Compiler, RspackPluginInstance } from '@rspack/core';
import jwt from 'jsonwebtoken';
import { type CodeSigningPluginConfig, validateConfig } from './config.js';

export class CodeSigningPlugin implements RspackPluginInstance {
  private chunkFilenames: Set<string>;

  /**
   * Constructs new `RepackPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: CodeSigningPluginConfig) {
    validateConfig(config);
    this.config.excludeChunks = this.config.excludeChunks ?? [];
    this.chunkFilenames = new Set();
  }

  private shouldSignFile(
    file: string,
    mainOutputFilename: string,
    excludedChunks: string[] | RegExp[]
  ): boolean {
    /** Exclude non-chunks & main chunk as it's always local */
    if (!this.chunkFilenames.has(file) || file === mainOutputFilename) {
      return false;
    }

    return !excludedChunks.some((chunk) => {
      if (chunk instanceof RegExp) {
        return chunk.test(file);
      }
      return chunk === file;
    });
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: Compiler) {
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

    compiler.hooks.emit.tap('RepackCodeSigningPlugin', (compilation) => {
      compilation.chunks.forEach((chunk) => {
        chunk.files.forEach((file) => this.chunkFilenames.add(file));
      });
    });

    compiler.hooks.assetEmitted.tapPromise(
      { name: 'RepackCodeSigningPlugin', stage: 20 },
      async (file, { outputPath, content, compilation }) => {
        const mainBundleName = compilation.outputOptions.filename as string;
        if (!this.shouldSignFile(file, mainBundleName, excludedChunks)) {
          return;
        }
        logger.debug(`Signing ${file}`);
        /** generate bundle hash */
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        /** generate token */
        const token = jwt.sign({ hash }, privateKey, { algorithm: 'RS256' });
        /** combine the bundle and the token */
        const signedBundle = Buffer.concat(
          [content, Buffer.from(BEGIN_CS_MARK), Buffer.from(token)],
          content.length + TOKEN_BUFFER_SIZE
        );

        const writeFileAsync = util.promisify(
          compiler.outputFileSystem!.writeFile
        );
        await writeFileAsync(path.join(outputPath, file), signedBundle);
        logger.debug(`Signed ${file}`);
      }
    );
  }
}
