# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is a pnpm monorepo using Nx for task orchestration. The root package.json contains the most important commands:

**Build & Development:**
- `pnpm build` - Build all packages using Nx
- `pnpm dev` - Build once then watch for changes across all packages
- `pnpm lint` - Run Biome linter with auto-fix
- `pnpm lint:ci` - Run Biome linter without auto-fix (CI mode)
- `pnpm typecheck` - Run TypeScript checking across all packages
- `pnpm test` - Run tests across all packages

**iOS Development:**
- `pnpm pods` - Install CocoaPods dependencies for all apps
- `pnpm pods:update` - Update CocoaPods dependencies

**Testing with specific configurations:**
Use the test apps in the `apps/` directory to verify functionality:
- `apps/tester-app` - Main test application
- `apps/tester-federation-v2` - Module Federation v2 testing
- `apps/tester-federation` - Module Federation v1 testing

**Individual package commands:**
Navigate to specific packages and use their local scripts. For example, in `packages/repack/`:
- `pnpm test` - Run Jest tests
- `pnpm build` - Build the package
- `pnpm clang-format` - Format native code (iOS and Android)

## Architecture Overview

Re.Pack is a React Native bundler that provides webpack/rspack bundling as an alternative to Metro. The codebase is organized as follows:

**Core Packages:**
- `packages/repack/` - Main bundler package with CLI commands, webpack plugins, and runtime modules
- `packages/dev-server/` - Development server implementation
- `packages/init/` - CLI tool for initializing Re.Pack in React Native projects
- `packages/plugin-*` - Various plugins (expo-modules, nativewind, reanimated)

**Key Architecture Components:**
- **Commands** (`packages/repack/src/commands/`) - CLI implementations for rspack and webpack bundling
- **Plugins** (`packages/repack/src/plugins/`) - Webpack/Rspack plugins for React Native bundling
- **Loaders** (`packages/repack/src/loaders/`) - Custom webpack loaders (assets, babel, flow, react-refresh)
- **Modules** (`packages/repack/src/modules/`) - Runtime modules including ScriptManager for chunk loading
- **Native Code** - iOS (Swift/Objective-C) and Android (Kotlin) implementations in `packages/repack/ios/` and `packages/repack/android/`

**Development Server:**
The development server supports both single-platform (webpack CLI) and multi-platform (repack commands) modes with features like HMR, symbolication, and debugging.

**Module Federation:**
Re.Pack provides first-class support for Module Federation for microfrontend architectures, with plugins for both v1 and v2.

## Code Style & Standards

- **Biome:** Uses Biome (configured in `biome.jsonc`) for import organization, formatting, and linting with specific rules for different file types
- **TypeScript:** Strict TypeScript configuration with path mapping
- **Formatting:** 2-space indentation, single quotes, trailing commas (ES5), semicolons always
- **Import Organization:** Biome automatically organizes imports when running `pnpm lint`
- **Native Code:** Use clang-format for iOS/Android C++/Swift/Kotlin code formatting

## Testing Strategy

- Jest for unit tests with specific configurations per package
- Metro compatibility tests in `tests/metro-compat/`
- Resolver test cases in `tests/resolver-cases/`
- Integration testing via tester apps

## Key Development Notes

- This is a monorepo managed by pnpm workspaces with Nx orchestration
- The project supports both Webpack and Rspack as bundling engines
- Native modules require building iOS and Android code when making changes
- Always run `pnpm lint` and `pnpm typecheck` before committing changes
- Use the tester apps to verify functionality across different React Native configurations
- When working with native code, run `pnpm clang-format` to ensure consistent formatting