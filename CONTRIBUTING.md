# Contributing to `@callstack/nativepack`

## Code of Conduct

We want this community to be friendly and respectful to each other. Please read [the full text](./CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## Our Development Process

All development is done directly on GitHub, and all work is public.

### Development workflow

> **Working on your first pull request?** You can learn how from this *free* series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

1. Fork the repo and create your branch from `main` (a guide on [how to fork a repository](https://help.github.com/articles/fork-a-repo/)).
2. Run `npm i` to install & set up the development environment.
3. Do the changes you want and test them out in the TesterApp (`examples/TesterApp`) before sending a pull request.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix Button color on DarkTheme.
- `feat`: new features, e.g. add Snackbar component.
- `refactor`: code refactor, e.g. new folder structure for components.
- `docs`: changes into documentation, e.g. add usage example for Button.
- `test`: adding or updating tests, e.g. unit, snapshot testing.
- `chore`: tooling changes, e.g. change circleci config.
- `BREAKING CHANGE`: for changes that break existing usage, e.g. change API of a component.

### Linting and tests

We use `typescript` for type checking, `eslint` with `prettier` for linting and formatting the code, and `jest` for testing. You should run the following commands before sending a pull request:

- `npm run tsc`: type-check files with `tsc`.
- `npm run lint`: lint files with `eslint` and `prettier`.
- `npm run test`: run unit tests with `jest`.

### Sending a pull request

- Prefer small pull requests focused on one change.
- Verify that `typescript`, `eslint` and all tests are passing.
- Verify all in-code documentation is correct (it will be used to generate API documentation).
- Follow the pull request template when opening a pull request.

### Running the example

The example TesterApp uses React Native CLI so make sure you have your [environment setup to build native apps](https://reactnative.dev/docs/environment-setup).

You can then use Xcode/Android Studio/Gradle to build application or run `npx react-native webpack-start` and `npx react-native run-ios`/`npx react-native run-android` to start development server and run applications in development mode.

### Working on documentation

The documentation is automatically generated from the [TypeScript](https://www.typescriptlang.org/) types and in-code documentation comments using [TypeDoc](https://typedoc.org/).

### Publishing a release

We use [release-it](https://github.com/webpro/release-it) to automate our release. If you have publish access to the NPM package, run the following from the main branch to publish a new release:

```sh
npm run release
```

NOTE: You must have a `GITHUB_TOKEN` environment variable available. You can create a GitHub access token with the "repo" access [here](https://github.com/settings/tokens).

## Reporting issues

You can report issues on our [bug tracker](https://github.com/callstack/nativepack/issues). Please follow the issue template when opening an issue.

## License

By contributing to `@callstack/nativepack`, you agree that your contributions will be licensed under its **MIT** license.
