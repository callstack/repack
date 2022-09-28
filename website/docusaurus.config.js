const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'Re.Pack',
  tagline:
    'A Webpack-based toolkit to build your React Native application with full support of Webpack ecosystem.',
  url: 'https://re-pack.netlify.app',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'Callstack',
  projectName: 'Re.Pack',
  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
    },
    navbar: {
      logo: {
        alt: 'Re.Pack Logo',
        src: 'img/logo_light.svg',
        srcDark: 'img/logo_dark.svg',
      },
      items: [
        {
          type: 'docsVersionDropdown',
          position: 'left',
          dropdownActiveClassDisabled: true,
        },
        {
          type: 'doc',
          docId: 'about',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'doc',
          docId: 'configuration/webpack-config',
          position: 'left',
          label: 'Configuration',
        },
        {
          type: 'doc',
          docId: 'api/about',
          position: 'left',
          label: 'API',
        },
        {
          href: 'https://github.com/callstack/repack-examples',
          label: 'Examples',
          position: 'left',
        },
        // {
        //   to: '/blog',
        //   label: 'Blog',
        //   position: 'left'
        // },
        {
          href: 'https://github.com/callstack/repack',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Configuration',
              to: '/docs/configuration/webpack-config',
            },
            {
              label: 'API',
              to: '/docs/api/about',
            },
            {
              label: '@callstack/repack API',
              to: '/docs/api/repack',
            },
            {
              label: '@callstack/dev-server API',
              to: '/docs/api/dev-server',
            },
          ],
        },
        {
          title: 'Social',
          items: [
            // {
            //   label: 'Blog',
            //   to: '/blog',
            // },
            {
              label: 'GitHub',
              href: 'https://github.com/callstack/repack',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/repack_rn',
            },
            {
              label: 'Callstack',
              href: 'https://callstack.com',
            },
          ],
        },
        {
          title: 'Built with',
          items: [
            {
              label: 'Docusaurus',
              href: 'https://docusaurus.io/',
            },
            {
              label: 'Netlify',
              href: 'https://www.netlify.com/',
            },
          ],
        },
      ],
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          lastVersion: 'current',
          versions: {
            current: {
              label: '3x',
            },
          },
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/callstack/repack/edit/main/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/callstack/repack/edit/main/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
