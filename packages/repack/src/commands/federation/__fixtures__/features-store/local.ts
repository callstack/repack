// Relative and alias imports are project-internal, never dependencies.
import data from '../data.json';
import config from '@/config';
import { helper } from './helper';

export const stuff = [helper, data, config];
