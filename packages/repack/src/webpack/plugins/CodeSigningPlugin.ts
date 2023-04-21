import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import jwt from 'jsonwebtoken';
import webpack from 'webpack';
import type { WebpackPlugin } from '../../types';

/**
 * {@link CodeSigningPlugin} configuration options.
 */
export interface CodeSigningPluginConfig {
  /** Output path to a directory, where signed bundles should be saved. */
  outputPath: string;
  /** Path to the private key. */
  privateKeyPath: string;
  /** Names of chunks to exclude from being signed. */
  excludeChunks?: string[];
}

export class CodeSigningPlugin implements WebpackPlugin {
  /**
   * Constructs new `RepackPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: CodeSigningPluginConfig) {
    this.config.privateKeyPath = this.config.privateKeyPath ?? './private.pem';
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const pluginName = CodeSigningPlugin.name;
    // reserve 1280 bytes for the token even if it's smaller
    // to leave some space for future additions to the JWT without breaking compatibility
    const tokenBufferSize = 1280;
    const privateKeyPath = path.join(
      compiler.context,
      this.config.privateKeyPath
    );
    const privateKey = fs.readFileSync(privateKeyPath);
    const chunkFiles = new Set<string>();
    // Tapping to the "thisCompilation" hook in order to further tap
    // to the compilation process on an later stage.
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      // we need to make sure that assets are fully processed in order
      // to create a code-signing mapping.
      compilation.hooks.afterProcessAssets.tap(pluginName, (assets) => {
        // "assets" is an object that contains all assets
        // in the compilation, the keys of the object are pathnames of the assets
        // and the values are file sources.

        // adjust for chunk name to filename
        compilation.chunks.forEach((chunk) => {
          chunk.files.forEach((file) => {
            // Exclude main output bundle because it's always local
            if (file === compilation.outputOptions.filename) {
              return;
            }
            // Exclude chunks specified in config
            if (this.config.excludeChunks?.includes(String(chunk.id))) {
              return;
            }
            chunkFiles.add(file);
          });
        });
      });

      compiler.hooks.afterEmit.tapPromise(pluginName, async (compilation) => {
        await Promise.all(
          Array.from(chunkFiles).map(async (chunk) => {
            const bundle = await fs.readFile(
              path.join(compilation.outputOptions.path!, chunk)
            );

            // generate bundle hash
            const hash = crypto
              .createHash('sha256')
              .update(bundle)
              .digest('hex');

            // generate token
            const token = jwt.sign({ hash }, privateKey, {
              algorithm: 'RS256',
            });

            // combine the bundle and the token
            const tokenBuffer = Buffer.from(token);
            const signedBundle = Buffer.alloc(bundle.length + tokenBufferSize);

            bundle.copy(signedBundle);
            tokenBuffer.copy(
              signedBundle,
              bundle.length + tokenBufferSize - tokenBuffer.length
            );

            await fs.ensureDir(this.config.outputPath);
            await fs.writeFile(
              path.join(compiler.context, this.config.outputPath, chunk),
              signedBundle
            );
          })
        );
      });
    });
  }
}
