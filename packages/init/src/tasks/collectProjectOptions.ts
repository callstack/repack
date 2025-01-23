import fs from 'node:fs';
import path from 'node:path';
import { confirm, select, text } from '@clack/prompts';
import { cancelPromptAndExit, checkCancelPrompt } from '../utils/prompts.js';

interface ProjectOptions {
  projectName: string;
  shouldOverrideProject: boolean;
  bundler: 'rspack' | 'webpack';
}

export default async function collectProjectOptions(
  cwd: string,
  projectExists: boolean
): Promise<ProjectOptions> {
  let shouldOverrideProject = false;
  let projectName: string;

  if (!projectExists) {
    // TODO validate project name
    // steal from RNEF
    projectName = checkCancelPrompt<string>(
      await text({
        message: 'How would you like to name the app?',
        defaultValue: 'RepackApp',
        placeholder: 'RepackApp',
      })
    );

    const projectPath = path.join(cwd, projectName);
    if (fs.existsSync(projectPath)) {
      shouldOverrideProject = checkCancelPrompt<boolean>(
        await confirm({
          message: `Directory "${projectName}" is not empty. Would you like to override it?`,
          initialValue: false,
        })
      );

      if (!shouldOverrideProject) {
        cancelPromptAndExit();
      }
    }
  } else {
    const packageJsonPath = path.join(cwd, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    projectName = packageJson.name;
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
    shouldOverrideProject,
    bundler,
  };
}
