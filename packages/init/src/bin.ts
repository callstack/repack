#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import info from '../package.json' assert { type: 'json' };
import run from './index.js';

const argv = yargs(hideBin(process.argv))
  .usage(`Usage: ${info.name} [options]`)
  .option('bundler', {
    alias: 'b',
    type: 'string',
    choices: ['rspack', 'webpack'],
    description: 'Specify the bundler to use',
  })
  .option('custom-version', {
    alias: 'c',
    type: 'string',
    description: 'Specify the version of `@callstack/repack` to install',
  })
  .option('entry', {
    alias: 'e',
    type: 'string',
    description: 'Path to the main entry point of the React-Native project',
    default: 'index.js',
  })
  .option('format', {
    alias: 'f',
    type: 'string',
    choices: ['mjs', 'cjs'],
    description: 'Format of the config file',
    default: 'mjs',
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Enable verbose logging',
    default: false,
  })
  .conflicts('mjs', 'cjs')
  .version(info.version)
  .help()
  .wrap(null)
  .parseSync();

void run({
  bundler: argv.bundler as 'rspack' | 'webpack',
  entry: argv.entry,
  repackVersion: argv.customVersion,
  templateType: argv.format as 'mjs' | 'cjs',
  verbose: argv.verbose,
});
