import { spinner } from '@clack/prompts';
import { execa } from 'execa';

interface ProjectOptions {
  projectName: string;
}

export default async function createNewProject(options: ProjectOptions) {
  const _spinner = spinner();
  try {
    _spinner.start('Creating new project using @react-native-community/cli');
    return await execa(
      `npx @react-native-community/cli@latest init ${options.projectName} --skip-install --replace-directory`,
      { stdio: 'ignore', shell: true }
    );
  } catch {
    // CLI will print the detailed error message
    throw new Error(
      "Failed to create a new project using '@react-native-community/cli'"
    );
  } finally {
    _spinner.stop('', 0);
  }
}
