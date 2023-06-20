import fs from 'fs-extra';
import execa from 'execa';

interface TransformBundleToHermesBytecodeOptions {
  hermesCLIPath: string;
  useSourceMaps: boolean;
  filePath: string;
}

export const transformBundleToHermesBytecode = async ({
  hermesCLIPath,
  useSourceMaps,
  filePath,
}: TransformBundleToHermesBytecodeOptions) => {
  const outputFile = filePath + '.hbc';
  const hermesSourceMapPath = filePath + '.hbc.map';

  // Transform bundle to bytecode
  await execa(
    hermesCLIPath,
    [
      '-w', // Silence warnings else buffer overflows
      '-O', // Enable optimizations
      '-emit-binary',
      '-out',
      outputFile,
      useSourceMaps ? '-output-source-map' : '',
      filePath,
    ].filter(Boolean)
  );

  // Replace bundle with bytecode
  await fs.unlink(filePath);
  await fs.rename(outputFile, filePath);

  return { sourceMap: hermesSourceMapPath };
};
