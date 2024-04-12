import * as path from 'path';
import { defineConfig } from 'rspress/config';
import { pluginFontOpenSans } from 'rspress-plugin-font-open-sans';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  root: path.join(__dirname, 'src'),
  title: 'Re.Pack',
  description:
    'A Webpack-based toolkit to build your React Native application with full support of Webpack ecosystem.',
  icon: '/img/favicon.ico',
  logo: {
    light: '/img/logo_light.svg',
    dark: '/img/logo_dark.svg',
  },
  outDir: 'build',
  markdown: {
    checkDeadLinks: !isProd, // disable in production due to upstream bug
    codeHighlighter: 'prism',
  },
  multiVersion: {
    default: '3.x',
    versions: ['2.x', '3.x'],
  },
  route: {
    cleanUrls: true,
  },
  themeConfig: {
    enableContentAnimation: true,
    enableScrollToTop: true,
    outlineTitle: 'Contents',
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
  globalStyles: path.join(__dirname, 'src/styles/index.css'),
  builderConfig: {
    tools: {
      rspack(config, { addRules }) {
        addRules([
          {
            resourceQuery: /raw/,
            type: 'asset/source',
          },
        ]);
      },
    },
  },
  plugins: [pluginFontOpenSans()],
  search: {
    searchHooks: path.join(__dirname, './search/index.tsx'),
  },
});
