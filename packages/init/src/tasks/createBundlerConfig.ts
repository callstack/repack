import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';
import ora, { type Ora } from 'ora';

import logger from '../utils/logger.ts';

// TODO adjust before publishing a stable release (jbroma)
const TEMPLATES = {
  rspack: {
    mjs: 'https://raw.githubusercontent.com/callstack/repack/main/templates_v5/rspack.config.mjs',
    cjs: 'https://raw.githubusercontent.com/callstack/repack/main/templates_v5/rspack.config.cjs',
  },
  webpack: {
    mjs: 'https://raw.githubusercontent.com/callstack/repack/main/templates_v5/webpack.config.mjs',
    cjs: 'https://raw.githubusercontent.com/callstack/repack/main/templates_v5/webpack.config.cjs',
  },
} as const;

async function fetchConfigTemplate(
  bundler: 'rspack' | 'webpack',
  templateType: 'mjs' | 'cjs'
) {
  const url = TEMPLATES[bundler][templateType];

  let spinner: Ora | undefined;

  try {
    spinner = ora(
      `Downloading ${bundler}.config.${templateType} template`
    ).start();
    const template = await fetch(url);
    spinner.succeed();
    return template.text();
  } catch (error) {
    spinner?.fail(`Failed to fetch ${bundler}.config template from ${url}`);
    throw error;
  }
}

function adjustEntryFilename(template: string, entry: string) {
  if (entry === 'index.js') {
    return template;
  }

  return template.replace(/entry\s=.*,/, `entry = '${entry}',`);
}
/**
 * Adds bundler config file to the project
 *
 * @param cwd current working directory
 * @param templateType mjs or cjs
 * @param entry name of the entry file for the application
 */
export default async function createBundlerConfig(
  bundler: 'rspack' | 'webpack',
  cwd: string,
  templateType: 'mjs' | 'cjs',
  entry: string
): Promise<void> {
  const configPath = path.join(cwd, `${bundler}.config.${templateType}`);

  if (fs.existsSync(configPath)) {
    logger.warn(
      `File "${bundler}.config.${templateType}" already exists. Overwriting...`
    );
  }

  let configTemplate = await fetchConfigTemplate(bundler, templateType);
  configTemplate = adjustEntryFilename(configTemplate, entry);

  fs.writeFileSync(configPath, configTemplate);
  logger.success(`Created ${bundler}.config.${templateType} from template`);
}
