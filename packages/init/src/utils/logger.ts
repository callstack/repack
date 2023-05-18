import chalk from 'chalk';

let verbose = false;

const logger = {
  success: (message: string) => console.log(`${chalk.green('✔')} ${message}`),
  warn: (message: string) => console.log(`${chalk.yellow('⚑')} ${message}`),
  error: (message: string) => console.log(`${chalk.red('✖')} ${message}`),
  fatal: (message: string) => console.log(`\n💥 ${chalk.redBright(message)}`),
  done: (message: string) => console.log(`\n🎉 ${chalk.greenBright(message)}`),
  info: (message: string) =>
    verbose && console.log(`${chalk.blue('ℹ')} ${message}`),
};

export default logger;

export function enableVerboseLogging() {
  verbose = true;
}
