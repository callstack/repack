import * as path from 'path';
import { defineConfig } from 'rspress/config';
import { pluginFontOpenSans } from 'rspress-plugin-font-open-sans';

export default defineConfig({
  root: path.join(__dirname, 'src'),
  title: 'Re.Pack docs',
  description: 'Re.Pack documentation',
  icon: '/img/favicon.ico',
  logo: {
    light: 'https://re-pack.netlify.app/img/logo_light.svg',
    dark: 'https://re-pack.netlify.app/img/logo_dark.svg',
  },
  markdown: {
    checkDeadLinks: true,
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
