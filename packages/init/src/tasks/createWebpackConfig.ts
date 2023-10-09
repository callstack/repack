import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import ora from 'ora';

import logger from '../utils/logger.js';

const MJSTemplateURL =
  'https://raw.githubusercontent.com/callstack/repack/main/templates/webpack.config.mjs';
const CJSTemplateURL =
  'https://raw.githubusercontent.com/callstack/repack/main/templates/webpack.config.cjs';

async function fetchConfigTemplate(templateType: 'mjs' | 'cjs') {
  let url;
  if (templateType === 'mjs') {
    url = MJSTemplateURL;
  } else {
    url = CJSTemplateURL;
  }

  let spinner;
  try {
    spinner = ora(
      `Downloading webpack.config.${templateType} template`
    ).start();
    const template = await fetch(url);
    spinner.succeed();
    return template.text();
  } catch (error) {
    spinner?.fail(`Failed to fetch webpack.config template from ${url}`);
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
 * Adds webpack.config file to the project
 *
 * @param cwd current working directory
 * @param templateType mjs or cjs
 * @param entry name of the entry file for the application
 */
export default async function createWebpackConfig(
  cwd: string,
  templateType: 'mjs' | 'cjs',
  entry: string
): Promise<void> {
  const configPath = path.join(cwd, `webpack.config.${templateType}`);

  if (fs.existsSync(configPath)) {
    logger.warn(
      `File "webpack.config.${templateType}" already exists. Overwriting...`
    );
  }

  let configTemplate = await fetchConfigTemplate(templateType);
  configTemplate = adjustEntryFilename(configTemplate, entry);

  fs.writeFileSync(configPath, configTemplate);
  logger.success(`Created webpack.config.${templateType} from template`);
}
