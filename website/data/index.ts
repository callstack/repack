import fs from 'fs';
import path from 'path';
import { JSONOutput } from 'typedoc';

// TODO: figure out nicer way to getting this data
export const API_PROJECT_REFLECTION: JSONOutput.ProjectReflection = require('./api.json');
export const README_SOURCE = fs.readFileSync(
  path.join(process.cwd(), '../README.md'),
  'utf-8'
);
