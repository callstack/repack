// Adversarial noise: comments, strings and templates must NEVER yield
// dependencies. Only `real-lib` (and the ignored jsx-runtime import) exist
// for the scanner to see here.
// import 'commented-line-pkg'
/* import 'block-comment-pkg'
   require('block-require-pkg') */
import real from 'real-lib';
import { jsx } from 'react/jsx-runtime';

const slogan = 'react';
const tricky = 'from \'sneaky-quoted-pkg\'';
const inTemplate = `
  import fake from 'template-fake-pkg';
  require('template-require-fake-pkg');
`;
const escaped = 'he said "import \'escaped-quoted-pkg\'" fine';

export const all = [real, jsx, slogan, tricky, inTemplate, escaped];
