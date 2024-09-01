import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { stringifyStream } from '@discoveryjs/json-ext';

type Logger = {
  info: (...message: string[]) => void;
  warn: (...message: string[]) => void;
  error: (...message: string[]) => void;
};

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

export async function writeStats(
  stats: any,
  filepath: string,
  logger: Logger = console
) {
  // TODO normalize filepath
  logger.info(`Writing compiler stats`);

  try {
    // Stats can be fairly big at which point their JSON no longer fits into a single string.
    // Approach was copied from `webpack-cli`: https://github.com/webpack/webpack-cli/blob/c03fb03d0aa73d21f16bd9263fd3109efaf0cd28/packages/webpack-cli/src/webpack-cli.ts#L2471-L2482
    const statsStream = stringifyStream(stats);
    const outputStream = fs.createWriteStream(filepath);
    await pipeline(statsStream, outputStream);
    logger.info(`Wrote compiler stats to ${filepath}`);
  } catch (error) {
    logger.error(String(error));
    process.exit(2);
  }
}
