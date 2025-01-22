import { select } from '@clack/prompts';
import { isTruthyEnv } from '../utils/isTruthyEnv.js';
import logger from '../utils/logger.js';
import { checkCancelPrompt } from '../utils/prompts.js';

export default async function selectBundler(): Promise<'rspack' | 'webpack'> {
  if (isTruthyEnv(process.env.CI)) {
    logger.info('Running in CI, using rspack. Use --bundler flag to override.');
    return 'rspack';
  }

  return checkCancelPrompt(
    select({
      message: 'Which bundler would you like to use?',
      options: [
        {
          label: 'Rspack',
          value: 'rspack',
          hint: 'recommended',
        },
        {
          label: 'Webpack',
          value: 'webpack',
        },
      ],
      initialValue: 'rspack',
    })
  );
}
