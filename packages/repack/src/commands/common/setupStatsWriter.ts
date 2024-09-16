import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { stringifyStream } from '@discoveryjs/json-ext';
import { Logger } from '../../types';

function normalizeFilepath(filepath: string, root: string): string {
  if (path.isAbsolute(filepath)) {
    return filepath;
  }
  return path.resolve(root, filepath);
}

export function normalizeStatsOptions<Stats>(
  options: Stats,
  preset?: string
): Stats {
  if (preset !== undefined) {
    return { preset: preset } as Stats;
  } else if (options === true) {
    return { preset: 'normal' } as Stats;
  } else if (options === false) {
    return { preset: 'none' } as Stats;
  } else {
    return options;
  }
}

interface WriteStatsOptions {
  filepath: string;
  logger?: Logger;
  rootDir?: string;
}

export async function writeStats(
  stats: any,
  { filepath, logger = console, rootDir = process.cwd() }: WriteStatsOptions
) {
  const outputPath = normalizeFilepath(filepath, rootDir);
  logger.info(`Writing compiler stats`);

  try {
    // Stats can be fairly big at which point their JSON no longer fits into a single string.
    // Approach was copied from `webpack-cli`: https://github.com/webpack/webpack-cli/blob/c03fb03d0aa73d21f16bd9263fd3109efaf0cd28/packages/webpack-cli/src/webpack-cli.ts#L2471-L2482
    const statsStream = stringifyStream(stats);
    const outputStream = fs.createWriteStream(outputPath);
    await pipeline(statsStream, outputStream);
    logger.info(`Wrote compiler stats to ${outputPath}`);
  } catch (error) {
    logger.error(String(error));
    process.exit(2);
  }
}
