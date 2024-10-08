<p align="center">
  <img src="https://raw.githubusercontent.com/callstack/repack/HEAD/logo.png">
</p>
<p align="center">
A toolkit to build your React Native application with Rspack or Webpack.
</p>

---

[![Build Status][build-badge]][build]
[![Version][version-badge]][version]
[![MIT License][license-badge]][license]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]
[![Code of Conduct][coc-badge]][coc]

`@callstack/repack-init` is a tool that automates the integration of the `@callstack/repack` into React-Native projects`.

## Usage

```sh
npx @callstack/repack-init [options]
```

## Options

- `-c, --custom-version` Specify the version of `@callstack/repack` to install.

- `-e, --entry` Path to the main entry point of the React-Native project. Defaults to: `index.js`.

- `-f, --format` Format of the webpack.config file. Available choices: `"mjs"`, `"cjs"`. Defaults to: `"mjs"`.

- `-v, --verbose` Enable verbose logging. Defaults to: `false`.

- `--version` Show version number.

- `--help` Show help.

---

Check out our website at https://re-pack.dev for more info and documentation or out GitHub: https://github.com/callstack/repack.

<!-- badges -->

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=react-native-paper&utm_term=readme-with-love
[build-badge]: https://img.shields.io/github/workflow/status/callstack/repack/CI/main?style=flat-square
[build]: https://github.com/callstack/repack/actions/workflows/main.yml
[version-badge]: https://img.shields.io/npm/v/@callstack/repack-init?style=flat-square
[version]: https://www.npmjs.com/package/@callstack/repack-init
[license-badge]: https://img.shields.io/npm/l/@callstack/repack-init?style=flat-square
[license]: https://github.com/callstack/repack/blob/master/LICENSE
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs-welcome]: ./CONTRIBUTING.md
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/callstack/repack/blob/master/CODE_OF_CONDUCT.md
