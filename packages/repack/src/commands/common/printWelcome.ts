import colorette from 'colorette';
import packageJson from '../../../package.json';

export function printWelcome() {
  const welcome = '📦 Re.Pack ' + packageJson.version + '\n\n';

  process.stdout.write(colorette.bold(colorette.cyan(welcome)));
}
