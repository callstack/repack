# Contributing to Re.Pack

## Code of Conduct

We want this community to be friendly and respectful to each other. Please read [the full text](./CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## Requirements

- Node 18+
- pnpm 8

## Our Development Process

All development is done directly on GitHub, and all work is public.

### Development workflow

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

1. Fork the repo and create your branch from default branch (usually `main`) (a guide on [how to fork a repository](https://help.github.com/articles/fork-a-repo/)).
2. Run `pnpm install` to install & set up the development environment.
3. Do the changes you want and test them out in the TesterApp (`packages/TesterApp`) before sending a pull request.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix Button color on DarkTheme.
- `feat`: new features, e.g. add Snackbar component.
- `refactor`: code refactor, e.g. new folder structure for components.
- `docs`: changes into documentation, e.g. add usage example for Button.
- `test`: adding or updating tests, e.g. unit, snapshot testing.
- `chore`: tooling changes, e.g. change circleci config.
- `BREAKING CHANGE`: for changes that break existing usage, e.g. change API of a component.

### Changesets

When adding new features, fixes or doing any changes to public API, behavior or logic is required to
create a changeset explaining what has been modified.

Once code changes are done, run `pnpm changeset add` and follow the CLI instructions to write a changeset.

You can learn more about changesets here: https://github.com/changesets/changesets

### Linting and tests

We use `typescript` for type checking, `eslint` with `prettier` for linting and formatting the code, and `jest`/`vitest` for testing. You should run the following commands before sending a pull request:

- `pnpm typecheck`: type-check files with `tsc`.
- `pnpm lint`: lint files with `eslint` and `prettier`.
- `pnpm test`: run unit tests with `jest`/`vitest`.

### Sending a pull request

- Prefer small pull requests focused on one change.
- Verify that `typescript`, `eslint` and all tests are passing.
- Verify all in-code documentation is correct (it will be used to generate API documentation).
- Write changeset if necessary.
- Follow the pull request template when opening a pull request.

### Running the example

The example TesterApp uses React Native CLI so make sure you have your [environment setup to build native apps](https://reactnative.dev/docs/environment-setup).

You can then use Xcode/Android Studio/Gradle to build application or run `pnpm react-native webpack-start` and `pnpm react-native run-ios`/`pnpm react-native run-android` to start development server and run applications in development mode. You can also use `pnpm TesterApp:start`/`pnpm TesterApp:build` from the root directory.

### Working on documentation

The documentation is automatically generated from the [TypeScript](https://www.typescriptlang.org/) types and in-code documentation comments using [TypeDoc](https://typedoc.org/). The documentation is a part of the website, which is stored in `website` directory and uses Docusaurus v2.

### Publishing a release

We use [changesets](https://github.com/changesets/changesets) to automate to bump the version, update `CHANGELOG.md` files in published packages and publish to NPM registry. If you have publish access to the NPM `@callstack` scope, run the following from the default branch (usually `main` branch) to publish a new release:

```sh
pnpm release
```

NOTE: You must have a `GITHUB_TOKEN` environment variable available. You can create a GitHub access token with the "repo" access [here](https://github.com/settings/tokens).

## Reporting issues

You can report issues on our [bug tracker](https://github.com/callstack/repack/issues). Please follow the issue template when opening an issue.

## License

By contributing to Re.Pack, you agree that your contributions will be licensed under its **MIT** license.
