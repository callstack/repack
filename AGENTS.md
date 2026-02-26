# AGENTS.md

Re.Pack is a toolkit for building and developing React Native applications with Webpack or Rspack instead of Metro. This repository contains the core bundling/runtime packages, integration plugins, and validation apps/tests used to verify behavior across supported setups.

## Repository Shape

- This is a JavaScript/TypeScript monorepo for Re.Pack (React Native bundling with Webpack/Rspack).
- `packages/` contains core libraries and integrations.
- `apps/` contains runnable validation applications.
- `tests/` contains compatibility and regression suites.

## Package Map (Relatively Stable Context)

- `packages/repack/`: Core toolkit with CLI commands, bundler plugins/loaders, and runtime modules.
- `packages/dev-server/`: Bundler-agnostic React Native development server.
- `packages/init/`: Initialization tooling for integrating Re.Pack into React Native projects.
- `packages/plugin-expo-modules/`: Re.Pack integration for Expo Modules.
- `packages/plugin-nativewind/`: Re.Pack integration for NativeWind.
- `packages/plugin-reanimated/`: Re.Pack integration for react-native-reanimated.

## Validation Surfaces

### Apps

- `apps/tester-app/`: Primary manual/integration validation app.
- `apps/tester-federation/`: Module Federation v1 validation app.
- `apps/tester-federation-v2/`: Module Federation v2 validation app.

### Tests

- `tests/integration/`: Integration-level automated coverage.
- `tests/metro-compat/`: Metro compatibility behavior coverage.
- `tests/resolver-cases/`: Resolver behavior and edge-case coverage.
