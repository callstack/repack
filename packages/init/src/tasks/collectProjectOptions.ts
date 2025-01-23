import { confirm, select, text } from '@clack/prompts';
import logger from '../utils/logger.js';
import { checkCancelPrompt } from '../utils/prompts.js';

interface ProjectSetup {
  projectExists: boolean;
  overrides?: {
    bundler: 'rspack' | 'webpack';
  };
}

interface ProjectOptions {
  projectName?: string;
  shouldCreateProject: boolean;
  bundler: 'rspack' | 'webpack';
}

export default async function collectProjectOptions({
  projectExists,
}: ProjectSetup): Promise<ProjectOptions> {
  let shouldCreateProject = false;
  let projectName: string | undefined;

  if (!projectExists) {
    shouldCreateProject = checkCancelPrompt<boolean>(
      await confirm({
        message: 'Would you like to create a new project?',
        initialValue: true,
      })
    );

    if (!shouldCreateProject) {
      logger.warn('Re.Pack setup cancelled by user');
      process.exit(0);
    }

    // TODO validate project name
    // steal from RNEF
    projectName = checkCancelPrompt<string>(
      await text({
        message: 'How would you like to name the app?',
        defaultValue: 'RepackApp',
        placeholder: 'RepackApp',
      })
    );
  }

  // Select bundler
  const bundler = checkCancelPrompt<'rspack' | 'webpack'>(
    await select({
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

  return {
    projectName,
    shouldCreateProject,
    bundler,
  };
}
