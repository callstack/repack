import colorette from 'colorette';
import packageJson from '../../../package.json';

export function printWelcome() {
  const repack = colorette.bold(colorette.magenta('Re.Pack'));
  const version = colorette.bold(colorette.magenta(packageJson.version));
  const welcome = [repack, version].join(' ');

  process.stdout.write(welcome + '\n\n');
}
