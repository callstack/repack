import * as path from 'node:path';
import { withCallstackPreset } from '@callstack/rspress-preset';

const LATEST_VERSION = 'v5';

const DOCS_ROOT = path.join('src', process.env.REPACK_DOC_VERSION ?? 'latest');
const EDIT_ROOT_URL = `https://github.com/callstack/repack/tree/main/website/${DOCS_ROOT}`;

export default withCallstackPreset(
  {
    context: __dirname,
    docs: {
      description:
        'A modern build tool for React Native that brings the Rspack and webpack ecosystem to mobile React Native apps',
      editUrl: EDIT_ROOT_URL,
      icon: '/img/favicon.ico',
      logoDark: '/img/logo-dark.png',
      logoLight: '/img/logo-light.png',
      ogImage: '/img/og-image.jpg',
      rootDir: DOCS_ROOT,
      rootUrl: 'https://re-pack.dev',
      socials: {
        github: 'https://github.com/callstack/repack',
        x: 'https://x.com/repack_rn',
        discord: 'https://discord.gg/TWDBep3nXV',
      },
      title: process.env.REPACK_DOC_VERSION
        ? `[${process.env.REPACK_DOC_VERSION}] Re.Pack`
        : 'Re.Pack',
    },
  },
  {
    outDir: 'build',
    globalStyles:
      process.env.REPACK_DOC_VERSION !== 'v2' &&
      process.env.REPACK_DOC_VERSION !== 'v3' &&
      process.env.REPACK_DOC_VERSION !== 'v4'
        ? path.join(__dirname, 'theme', 'styles.css')
        : undefined,
    themeConfig: {
      enableScrollToTop: true,
    },
    builderConfig: {
      source: {
        define: {
          'global.__REPACK_DOC_VERSION__': JSON.stringify(
            process.env.REPACK_DOC_VERSION
          ),
          'global.__REPACK_DOC_LATEST_VERSION__':
            JSON.stringify(LATEST_VERSION),
        },
      },
      tools: {
        rspack(_config, { addRules }) {
          addRules([
            {
              resourceQuery: /raw/,
              type: 'asset/source',
            },
          ]);
        },
      },
    },
  }
);
