import * as path from 'path';
import { defineConfig } from 'rspress/config';

export default defineConfig({
  root: path.join(__dirname, 'src'),
  title: 'Re.Pack docs',
  description: 'Re.Pack documentation',
  logo: {
    light: 'https://re-pack.netlify.app/img/logo_light.svg',
    dark: 'https://re-pack.netlify.app/img/logo_dark.svg',
  },
  markdown: {
    codeHighlighter: 'prism',
  },
  multiVersion: {
    default: '3.x',
    versions: ['2.x', '3.x'],
  },
  themeConfig: {
    enableContentAnimation: true,
    enableScrollToTop: true,
    outlineTitle: 'Contents',
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/web-infra-dev/rspress',
      },
    ],
  },
  globalStyles: path.join(__dirname, 'src/styles/index.css'),
});
