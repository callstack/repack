#!/usr/bin/env node

import { createRequire } from 'module';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import run from './index.js';

const require = createRequire(import.meta.url);
const info = require('../package.json');

const argv = yargs(hideBin(process.argv))
  .usage(`Usage: ${info.name} [options]`)
  .option('custom-version', {
    alias: 'c',
    type: 'string',
    description: "Specify the version of the '@callstack/repack' to install",
  })
  .option('entry', {
    alias: 'e',
    type: 'string',
    description: 'Path to main entry point for the React-Native project',
    default: 'index.js',
  })
  .option('format', {
    alias: 'f',
    type: 'string',
    choices: ['mjs', 'cjs'],
    description: 'Format of the webpack.config file',
    default: 'mjs',
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Enables verbose logging',
    default: false,
  })
  .conflicts('mjs', 'cjs')
  .version(info.version)
  .help()
  .parseSync();

void run({
  entry: argv.entry,
  repackVersion: argv.customVersion,
  templateType: argv.format as 'mjs' | 'cjs',
  verbose: argv.verbose,
});
