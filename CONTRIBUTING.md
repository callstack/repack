# Contributing to Re.Pack

## Code of Conduct

We want this community to be friendly and respectful to each other. Please read [the full text](./CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## Requirements

- Node 20+ (although Node 18 is still supported but has now reached EOL)
- pnpm 8 (use it via `corepack install`)

## Our Development Process

All development is done directly on GitHub, and all work is public.

### Development workflow

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

1. Fork the repo and create your branch from default branch (usually `main`) (a guide on [how to fork a repository](https://help.github.com/articles/fork-a-repo/)).
2. Run `pnpm install` to install & set up the development environment.
3. Do the changes you want and test them out in the TesterApp (`apps/tester-app`) before sending a pull request.

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

We use `typescript` for type checking and `biome` for linting and formatting the code, and `jest`/`vitest` for testing. You should run the following commands before sending a pull request:

- `pnpm typecheck`: type-check files with `tsc`.
- `pnpm lint`: lint files with `biome`.
- `pnpm test`: run unit tests with `jest`/`vitest`.

### Sending a pull request

- Prefer small pull requests focused on one change.
- Verify that `typescript`, `biome` and all tests are passing.
- Verify all in-code documentation is correct (it will be used to generate API documentation).
- Write changeset if necessary.
- Follow the pull request template when opening a pull request.

### Running the example

The example TesterApp uses React Native Community CLI so make sure you have your [environment setup to build native apps](https://reactnative.dev/docs/environment-setup).

You can then use Xcode/Android Studio/Gradle to build application or run `pnpm react-native webpack-start` and `pnpm react-native run-ios`/`pnpm react-native run-android` to start development server and run applications in development mode.

### Working on documentation

The documentation is a part of the website, which is stored in `website` directory and uses `rspress` - an SSG framework that leverages `rspack`. To start working on the docs, either run `pnpm website:start` from the root of the repository, or `pnpm start` from inside of the `website` directory.

### Publishing a release

We use [changesets](https://github.com/changesets/changesets) and the
[Changesets GitHub Action](https://github.com/changesets/action) to bump package
versions, update package `CHANGELOG.md` files, publish to npm, and create GitHub
releases.

#### Updating `repack-init` versions

`@callstack/repack-init` creates projects with the React Native and bundler
versions listed in `packages/init/versions.json`. Run
`pnpm --filter @callstack/repack-init update-versions` to refresh them to the
newest published releases, then create a project with the built init and check
that it bundles for both platforms before adding a changeset.

#### Stable releases

When releasable changesets are merged to `main`, the `Release` workflow creates
or updates a `chore: changeset version` pull request. This PR contains the exact
package version changes and generated changelog entries for the next release.

Review the version numbers and changelog entries in that PR before merging it.
When the version PR is merged to `main`, the same workflow runs `pnpm release`,
publishes the packages to npm and pushes all package release tags. A separate
step creates one GitHub release on the main package's tag (for example,
`@callstack/repack@5.4.2`), named after the shared version. Its notes list all
packages in the fixed release group and include their nonempty changelog entries
for that version. Package changelogs and npm publishing are still managed by
Changesets.

Preview the combined release without network access or credentials:

```sh
node .github/scripts/create-release.mjs --dry-run
pnpm test:release
```

If GitHub release creation fails after all package tags have reached GitHub,
rerun the failed release job at the same commit. The combined release step also
runs when Changesets has no new packages to publish. It verifies that all
fixed-group package tags resolve to `GITHUB_SHA` before creating the release,
and leaves an existing release untouched. A normal push with no release tags
at its SHA does not create a release.

This step does not recover npm publications or recreate package tags. If
publishing or pushing tags failed, check the npm publication status and restore
the missing release tags at the original release commit before retrying. A
missing tag or a tag pointing to another commit prevents release creation.

The combined release currently covers the fixed group containing
`@callstack/repack`. Before adding independently versioned packages to publishing,
extend the release selection policy; unexpected published packages fail this
step instead of being silently omitted.

#### Canary releases

Canary releases are published manually from the `Release` workflow in GitHub
Actions. Run it only from the `main` branch. The workflow creates snapshot
versions with the `canary` snapshot label, runs the full release checks, and
publishes with the `canary` npm dist-tag without committing version changes or
creating GitHub releases.

#### npm trusted publishing

Releases use npm trusted publishing instead of long-lived npm automation tokens.
Do not add `NPM_TOKEN` or `NODE_AUTH_TOKEN` secrets for publishing.

Each published package in the `@callstack` scope must have trusted publishing
configured on npmjs.com with GitHub Actions as the publisher:

- Owner: `callstack`
- Repository: `repack`
- Workflow file: `release.yml`
- Allowed action: `npm publish`

The release workflows intentionally disable package-manager caching to avoid
using a pnpm cache during publishing.

## Reporting issues

You can report issues on our [bug tracker](https://github.com/callstack/repack/issues). Please follow the issue template when opening an issue.

## License

By contributing to Re.Pack, you agree that your contributions will be licensed under its **MIT** license.
