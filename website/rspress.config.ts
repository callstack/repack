import * as path from 'node:path';
import { pluginCallstackTheme } from '@callstack/rspress-theme/plugin';
import { pluginLlms } from '@rspress/plugin-llms';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';
import { pluginFontOpenSans } from 'rspress-plugin-font-open-sans';
import pluginSitemap from 'rspress-plugin-sitemap';
import vercelAnalytics from 'rspress-plugin-vercel-analytics';
import { defineConfig } from 'rspress/config';

const LATEST_VERSION = 'v5';

const DOCS_ROOT = path.join('src', process.env.REPACK_DOC_VERSION ?? 'latest');
const EDIT_ROOT_URL = `https://github.com/callstack/repack/tree/main/website/${DOCS_ROOT}`;

export default defineConfig({
  root: path.join(__dirname, DOCS_ROOT),
  outDir: 'build',
  title: process.env.REPACK_DOC_VERSION
    ? `[${process.env.REPACK_DOC_VERSION}] Re.Pack`
    : 'Re.Pack',
  description:
    'A modern build tool for React Native that brings the Rspack and webpack ecosystem to mobile React Native apps',
  icon: '/img/favicon.ico',
  logo: {
    light: '/img/logo-light.png',
    dark: '/img/logo-dark.png',
  },
  markdown: {
    checkDeadLinks: true,
  },
  route: {
    cleanUrls: true,
  },
  search: {
    versioned: true,
    codeBlocks: true,
  },
  themeConfig: {
    enableContentAnimation: true,
    enableScrollToTop: true,
    outlineTitle: 'Contents',
    footer: {
      message: `Copyright © ${new Date().getFullYear()} Callstack Open Source`,
    },
    editLink: {
      docRepoBaseUrl: EDIT_ROOT_URL,
      text: '📝 Edit this page on GitHub',
    },
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/callstack/repack',
      },
      {
        icon: 'X',
        mode: 'link',
        content: 'https://x.com/repack_rn',
      },
      {
        icon: 'discord',
        mode: 'link',
        content: 'https://discord.gg/TWDBep3nXV',
      },
    ],
  },
  builderConfig: {
    source: {
      define: {
        'global.__REPACK_DOC_VERSION__': JSON.stringify(
          process.env.REPACK_DOC_VERSION
        ),
        'global.__REPACK_DOC_LATEST_VERSION__': JSON.stringify(LATEST_VERSION),
      },
    },
    output: {
      distPath: {
        // set explicitly for sitemap plugin
        root: 'build',
      },
    },
    plugins: [
      pluginOpenGraph({
        title: 'Re.Pack',
        type: 'website',
        url: 'https://re-pack.dev',
        image: 'https://re-pack.dev/img/og-image.png',
        description: 'A modern build tool for React Native',
        twitter: {
          site: '@repack_rn',
          card: 'summary_large_image',
        },
      }),
    ],
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
  globalStyles:
    process.env.REPACK_DOC_VERSION !== 'v2' &&
    process.env.REPACK_DOC_VERSION !== 'v3' &&
    process.env.REPACK_DOC_VERSION !== 'v4'
      ? path.join(__dirname, DOCS_ROOT, 'styles', 'index.css')
      : undefined,
  plugins: [
    // @ts-ignore
    pluginSitemap({
      domain: 'https://re-pack.dev',
    }),
    // @ts-ignore
    pluginFontOpenSans(),
    // @ts-ignore
    vercelAnalytics(),
    // @ts-ignore
    pluginCallstackTheme(),
    pluginLlms({
      exclude: ({ page }) => {
        return page.routePath.includes('404');
      },
    }),
  ],
});
