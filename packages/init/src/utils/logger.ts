import chalk from 'chalk';

let verbose = false;

const logger = {
  success: (message: string): void =>
    console.log(`${chalk.green('✔')} ${message}`),
  warn: (message: string): void =>
    console.log(`${chalk.yellow('⚑')} ${message}`),
  error: (message: string): void =>
    console.log(`${chalk.red('✖')} ${message}`),
  fatal: (message: string): void =>
    console.log(`\n💥 ${chalk.redBright(message)}`),
  done: (message: string): void =>
    console.log(`\n🎉 ${chalk.greenBright(message)}`),
  info: (message: string): void => {
    if (!verbose) return;
    console.log(`${chalk.blue('ℹ')} ${message}`);
  },
};

export default logger;

export function enableVerboseLogging(): void {
  verbose = true;
}
