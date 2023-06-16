import fs from 'fs/promises';
import execa from 'execa';

import type { Path } from '../../../../types';

interface TransformBundleToHermesBytecodeOptions {
  hermesCLIPath: Path;
  useSourceMaps: boolean;
  inputFile: Path;
  outputFile: Path;
}

export const transformBundleToHermesBytecode = async ({
  hermesCLIPath,
  useSourceMaps,
  inputFile,
  outputFile,
}: TransformBundleToHermesBytecodeOptions) => {
  // Transform bundle to bytecode
  await execa(hermesCLIPath, [
    '-w', // Silence warnings else buffer overflows
    '-O', // Enable optimizations
    useSourceMaps ? '-output-source-map' : '',
    '-emit-binary',
    '-out',
    inputFile,
    outputFile,
  ]);

  // Replace bundle with bytecode
  await fs.unlink(inputFile);
  await fs.rename(outputFile, inputFile);
};
