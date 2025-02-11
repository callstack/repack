<div align="center">
  <img src="https://raw.githubusercontent.com/callstack/repack/HEAD/logo.png" width="600" alt="Re.Pack logo" />
<h2>A toolkit to build your React Native application with Rspack or Webpack.</h2>
</div>
<div align="center">

[![mit licence][license-badge]][license]
[![npm downloads][npm-downloads-badge]][npm-downloads]
[![Chat][chat-badge]][chat]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]

</div>

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

[license-badge]: https://img.shields.io/npm/l/@callstack/repack?style=for-the-badge
[license]: https://github.com/callstack/repack/blob/main/LICENSE
[npm-downloads-badge]: https://img.shields.io/npm/dm/@callstack/repack?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@callstack/repack
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ./CONTRIBUTING.md
[chat-badge]: https://img.shields.io/discord/426714625279524876.svg?style=for-the-badge
[chat]: https://discord.gg/Q4yr2rTWYF
