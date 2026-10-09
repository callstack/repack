// Subpath specifiers map to their package root; scoped packages keep two
// segments.
import mapValues from '@utils/collection/map';
import merge from 'lodash/merge';
import 'zone.js/dist/zone';

export const fns = [merge, mapValues];
