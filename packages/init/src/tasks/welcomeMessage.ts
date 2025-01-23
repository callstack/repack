import { intro } from '@clack/prompts';
import chalk from 'chalk';
import gradient from 'gradient-string';

export default function welcomeMessage() {
  intro(
    chalk.bold(
      gradient([
        { color: '#9b6dff', pos: 0.45 },
        { color: '#3ce4cb', pos: 0.9 },
      ])('RE.PACK INIT')
    )
  );
}
