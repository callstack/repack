import { intro } from '@clack/prompts';
import chalk from 'chalk';

export default function welcomeMessage() {
  intro(chalk.bold('Re.Pack init'));
}
