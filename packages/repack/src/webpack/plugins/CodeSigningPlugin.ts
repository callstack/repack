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
  /** Output file name. */
  outputFile?: string;
  /** Output path to a directory, where code-signing mapping file should be saved. */
  outputPath?: string;
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
    this.config.outputFile =
      this.config.outputFile ?? 'code_signing_mapping.json';
    this.config.privateKeyPath = this.config.privateKeyPath ?? './private.pem';
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const pluginName = CodeSigningPlugin.name;
    const privateKeyPath = path.join(
      compiler.context,
      this.config.privateKeyPath
    );
    const privateKey = fs.readFileSync(privateKeyPath);

    // Tapping to the "thisCompilation" hook in order to further tap
    // to the compilation process on an later stage.
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      // we need to make sure that assets are fully processed in order
      // to create a code-signing mapping.
      compilation.hooks.afterProcessAssets.tap(pluginName, (assets) => {
        // "assets" is an object that contains all assets
        // in the compilation, the keys of the object are pathnames of the assets
        // and the values are file sources.
        const chunkFiles = new Set<string>();
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

        const content = Object.entries(assets)
          .filter(([fileName]) => chunkFiles.has(fileName))
          .reduce((acc, [fileName, file]) => {
            // get bundle
            const bundle = file.source();

            // generate bundle hash
            const hash = crypto
              .createHash('sha256')
              .update(bundle)
              .digest('hex');

            // generate token
            const token = jwt.sign({ hash }, privateKey, {
              algorithm: 'RS256',
            });

            acc[fileName] = token;

            return acc;
          }, {} as Record<string, string>);

        const json = JSON.stringify(content);

        if (this.config.outputPath) {
          fs.ensureDirSync(this.config.outputPath);
          fs.writeFileSync(
            path.join(
              compiler.context,
              this.config.outputPath,
              this.config.outputFile!
            ),
            json
          );
        } else {
          compilation.emitAsset(
            this.config.outputFile!,
            new webpack.sources.RawSource(json)
          );
        }
      });
    });
  }
}
