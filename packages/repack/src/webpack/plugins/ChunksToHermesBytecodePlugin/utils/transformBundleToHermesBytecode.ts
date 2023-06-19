import fs from 'fs-extra';
import execa from 'execa';

interface TransformBundleToHermesBytecodeOptions {
  hermesCLIPath: string;
  useSourceMaps: boolean;
  bundlePath: string;
}

export const transformBundleToHermesBytecode = async ({
  hermesCLIPath,
  useSourceMaps,
  bundlePath,
}: TransformBundleToHermesBytecodeOptions) => {
  const hermesBundlePath = bundlePath + '.hbc';
  const hermesSourceMapPath = bundlePath + '.hbc.map';

  // Transform bundle to bytecode
  await execa(
    hermesCLIPath,
    [
      '-w', // Silence warnings else buffer overflows
      '-O', // Enable optimizations
      '-emit-binary',
      '-out',
      hermesBundlePath,
      useSourceMaps ? '-output-source-map' : '',
      bundlePath,
    ].filter(Boolean)
  );

  await fs.unlink(bundlePath);
  await fs.rename(hermesBundlePath, bundlePath);

  return { sourceMap: hermesSourceMapPath };
};
