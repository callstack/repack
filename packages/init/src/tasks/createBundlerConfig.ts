import fs from 'node:fs';
import path from 'node:path';
import { RepackInitError } from '../utils/error.js';
import logger from '../utils/logger.js';
import spinner from '../utils/spinner.js';

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

  try {
    spinner.message(`Downloading ${bundler}.config.${templateType} template`);
    const template = await global.fetch(url);
    return template.text();
  } catch {
    throw new RepackInitError(
      `Failed to fetch ${bundler}.config template from ${url}`
    );
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
 * @param bundler bundler to use
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
    logger.info(
      `File "${bundler}.config.${templateType}" already exists. Overwriting...`
    );
  }

  let configTemplate = await fetchConfigTemplate(bundler, templateType);
  configTemplate = adjustEntryFilename(configTemplate, entry);

  fs.writeFileSync(configPath, configTemplate);

  logger.info(`Created ${bundler}.config.${templateType} from template`);
}
