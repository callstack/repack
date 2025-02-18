import * as path from 'node:path';
import { pluginCallstackTheme } from '@callstack/rspress-theme/plugin';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';
import { pluginFontOpenSans } from 'rspress-plugin-font-open-sans';
import vercelAnalytics from 'rspress-plugin-vercel-analytics';
import { defineConfig } from 'rspress/config';

export default defineConfig({
  root: path.join(__dirname, 'src'),
  title: '[v3] Re.Pack :)',
  description: 'A toolkit to build your React Native application with Webpack.',
  icon: '/img/favicon.ico',
  logo: {
    light: '/img/logo_light.svg',
    dark: '/img/logo_dark.svg',
  },
  outDir: 'build',
  markdown: {
    // TODO fix dead links
    checkDeadLinks: false,
    codeHighlighter: 'prism',
  },
  route: {
    cleanUrls: true,
  },
  search: {
    versioned: true,
  },
  themeConfig: {
    enableContentAnimation: true,
    enableScrollToTop: true,
    outlineTitle: 'Contents',
    footer: {
      message: `Copyright © ${new Date().getFullYear()} Callstack Open Source`,
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
    plugins: [
      pluginOpenGraph({
        title: 'Re.Pack',
        type: 'website',
        url: 'https://re-pack.dev',
        image: 'https://re-pack.dev/img/og-image.png',
        description:
          'A toolkit to build your React Native application with Webpack.',
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
  plugins: [
    // @ts-ignore
    pluginFontOpenSans(),
    // @ts-ignore
    vercelAnalytics(),
    // @ts-ignore
    pluginCallstackTheme(),
  ],
});
