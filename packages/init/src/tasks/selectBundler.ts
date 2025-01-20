import { select } from '@inquirer/prompts';
import { isTruthyEnv } from '../utils/isTruthyEnv.js';
import logger from '../utils/logger.js';

export default async function selectBundler(): Promise<'rspack' | 'webpack'> {
  if (isTruthyEnv(process.env.CI)) {
    logger.info('Running in CI, using rspack. Use --bundler flag to override.');
    return 'rspack';
  }

  return select({
    message: 'Which bundler would you like to use?',
    choices: [
      {
        name: 'Rspack (recommended)',
        value: 'rspack',
      },
      {
        name: 'Webpack',
        value: 'webpack',
      },
    ],
    default: 'rspack',
  });
}
