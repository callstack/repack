import fs from 'fs/promises';
import path from 'path';
import execa from 'execa';

/**
 * {@link composeSourceMaps} options.
 */
interface ComposeSourceMapsOptions {
  reactNativePath: string;
  packagerMapPath: string;
  compilerMapPath: string;
  outputFile: string;
}

/**
 * Composes source maps generated by webpack-bundle and Hermes.
 *
 * Removes original source map files.
 */
export const composeSourceMaps = async ({
  reactNativePath,
  packagerMapPath,
  compilerMapPath,
  outputFile,
}: ComposeSourceMapsOptions) => {
  await execa('node', [
    path.join(reactNativePath, 'scripts/compose-source-maps.js'),
    packagerMapPath,
    compilerMapPath,
    '-o',
    outputFile,
  ]);

  // Remove intermediate files
  await fs.unlink(packagerMapPath);
  await fs.unlink(compilerMapPath);
};