import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Compiler as RspackCompiler } from '@rspack/core';
import jwt from 'jsonwebtoken';
import type { Compiler as WebpackCompiler } from 'webpack';
import { type CodeSigningPluginConfig, validateConfig } from './config.js';
import { embedPublicKey } from './embedPublicKey.js';

function resolveProjectPath(
  projectRoot: string,
  configPath?: string
): string | undefined {
  if (!configPath) return undefined;
  return path.isAbsolute(configPath)
    ? configPath
    : path.resolve(projectRoot, configPath);
}

export class CodeSigningPlugin {
  /**
   * Constructs new `RepackPlugin`.
   *
   * @param config Plugin configuration options.
   */
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

  private signAsset(
    asset: { source: { source(): string | Buffer } },
    privateKey: Buffer,
    beginMark: string,
    tokenBufferSize: number
  ): Buffer {
    const source = asset.source.source();
    const content = Buffer.isBuffer(source) ? source : Buffer.from(source);

    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const token = jwt.sign({ hash }, privateKey, {
      algorithm: 'RS256',
    });

    return Buffer.concat(
      [content, Buffer.from(beginMark), Buffer.from(token)],
      content.length + tokenBufferSize
    );
  }

  private embedPublicKeyInNativeProjects(compiler: RspackCompiler) {
    if (!this.config.publicKeyPath) {
      return;
    }

    const logger = compiler.getInfrastructureLogger('RepackCodeSigningPlugin');
    const projectRoot = compiler.context;

    const publicKeyPath = resolveProjectPath(
      projectRoot,
      this.config.publicKeyPath
    );

    if (!publicKeyPath) return;

    if (!fs.existsSync(publicKeyPath)) {
      logger.warn(
        `Public key not found at ${publicKeyPath}. ` +
          'Skipping automatic embedding into native project files.'
      );
      return;
    }

    const result = embedPublicKey({
      publicKeyPath,
      projectRoot,
      iosInfoPlistPath: resolveProjectPath(
        projectRoot,
        this.config.nativeProjectPaths?.ios
      ),
      androidStringsXmlPath: resolveProjectPath(
        projectRoot,
        this.config.nativeProjectPaths?.android
      ),
    });

    if (result.error) {
      logger.warn(result.error);
      return;
    }

    if (result.ios.modified) {
      logger.info(`Embedded public key in iOS Info.plist: ${result.ios.path}`);
    } else if (result.ios.error) {
      logger.warn(`Failed to embed public key in iOS: ${result.ios.error}`);
    } else if (result.ios.path) {
      logger.debug(
        `Public key already up-to-date in iOS Info.plist: ${result.ios.path}`
      );
    } else {
      logger.warn(
        'Could not find iOS Info.plist. Skipping auto-embedding for iOS. ' +
          'Use nativeProjectPaths.ios or manually add the public key to Info.plist.'
      );
    }

    if (result.android.modified) {
      logger.info(
        `Embedded public key in Android strings.xml: ${result.android.path}`
      );
    } else if (result.android.error) {
      logger.warn(
        `Failed to embed public key in Android: ${result.android.error}`
      );
    } else if (result.android.path) {
      logger.debug(
        `Public key already up-to-date in Android strings.xml: ${result.android.path}`
      );
    } else {
      logger.warn(
        'Could not find Android strings.xml. Skipping auto-embedding for Android. ' +
          'Use nativeProjectPaths.android or manually add the public key to strings.xml.'
      );
    }
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
     * Used to denote the beginning of the code-signing section of the bundle
     * alias for "Repack Code-Signing Signature Begin"
     */
    const BEGIN_CS_MARK = '/* RCSSB */';

    const privateKeyPath = resolveProjectPath(
      compiler.context,
      this.config.privateKeyPath
    );

    if (!privateKeyPath) {
      throw new Error('[RepackCodeSigningPlugin] privateKeyPath is required.');
    }

    let privateKey: Buffer;
    try {
      privateKey = fs.readFileSync(privateKeyPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to read private key from ${privateKeyPath}: ${message}`
      );
    }

    this.embedPublicKeyInNativeProjects(compiler);

    const excludedChunks = Array.isArray(this.config.excludeChunks)
      ? this.config.excludeChunks
      : [this.config.excludeChunks as RegExp];

    compiler.hooks.thisCompilation.tap(
      'RepackCodeSigningPlugin',
      (compilation) => {
        const { sources } = compiler.webpack;
        const mainBundleName = compilation.outputOptions.filename as string;

        compilation.hooks.processAssets.tap(
          {
            name: 'RepackCodeSigningPlugin',
            // Sign at ANALYSE (2000) so later processAssets consumers,
            // such as Zephyr at REPORT (5000), receive already-signed assets
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

                logger.debug(`Signing ${file}`);
                const signedBundle = this.signAsset(
                  asset,
                  privateKey,
                  BEGIN_CS_MARK,
                  TOKEN_BUFFER_SIZE
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
