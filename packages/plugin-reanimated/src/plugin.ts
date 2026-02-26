import path from 'node:path';
import type { Compiler as RspackCompiler } from '@rspack/core';
import semver, { type SemVer } from 'semver';
import type { Compiler as WebpackCompiler } from 'webpack';
import { createReanimatedModuleRules } from './rules.js';

const REANIMATED_SETUP_TESTS_WARNING =
  /'`setUpTests` is available only in Jest environment\.'/;
const WORKLETS_CRITICAL_DEPENDENCY_WARNING =
  /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/;
const WORKLETS_INITIALIZERS_MODULE =
  /react-native-(?:worklets|reanimated)[\\/].*initializers(?:\.[cm]?[jt]sx?)?/;

type WarningLike = {
  message?: unknown;
  details?: unknown;
  moduleName?: unknown;
  moduleIdentifier?: unknown;
  module?: {
    resource?: unknown;
    userRequest?: unknown;
  };
};

function warningToSearchableText(warning: unknown): string {
  if (typeof warning === 'string') {
    return warning;
  }

  if (!warning || typeof warning !== 'object') {
    return '';
  }

  const warningObject = warning as WarningLike;
  return [
    warningObject.message,
    warningObject.details,
    warningObject.moduleName,
    warningObject.moduleIdentifier,
    warningObject.module?.resource,
    warningObject.module?.userRequest,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join('\n');
}

interface ReanimatedPluginOptions {
  /**
   * Custom options passed to 'react-native-reanimated/plugin' or 'react-native-worklets/plugin' babel plugins.
   */
  babelPluginOptions?: Record<string, any>;

  /**
   * Disable adding transformation rules for reanimated / worklets babel plugin.
   * This is useful when handling using `babel-swc-loader` or `babel-loader` and
   * you have already added the babel plugin to your babel config.
   */
  unstable_disableTransform?: boolean;
}

export class ReanimatedPlugin {
  constructor(private options: ReanimatedPluginOptions = {}) {}

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    const reanimatedPath = this.ensureDependencyInstalled(
      compiler.context,
      'react-native-reanimated'
    );

    const reanimatedVersion = this.getReanimatedVersion(reanimatedPath);

    if (reanimatedVersion.major >= 4) {
      this.ensureDependencyInstalled(compiler.context, 'react-native-worklets');
    }

    if (!this.options.unstable_disableTransform) {
      // add rules for transpiling with reanimated loader
      // TODO made obsolete by the new babel-swc-loader, remove in 6.0
      compiler.options.module.rules.push(
        createReanimatedModuleRules(
          reanimatedVersion.major,
          this.options.babelPluginOptions
        )
      );
    }

    // ignore the 'setUpTests' warning from reanimated which is not relevant
    compiler.options.ignoreWarnings = compiler.options.ignoreWarnings ?? [];
    compiler.options.ignoreWarnings.push((warning) => {
      const warningText = warningToSearchableText(warning);
      return (
        REANIMATED_SETUP_TESTS_WARNING.test(warningText) ||
        (WORKLETS_CRITICAL_DEPENDENCY_WARNING.test(warningText) &&
          WORKLETS_INITIALIZERS_MODULE.test(warningText))
      );
    });
  }

  private ensureDependencyInstalled(context: string, dependency: string) {
    try {
      // resolve the path to the dependency package.json
      // since its always in the root dir of the dependency
      const dependencyPackageJsonPath = path.join(dependency, 'package.json');
      const dependencyPath = require.resolve(dependencyPackageJsonPath, {
        paths: [context],
      });
      return path.dirname(dependencyPath);
    } catch {
      const error = new Error(
        `[RepackReanimatedPlugin] Dependency named '${dependency}' is required but not found in your project. ` +
          'Did you forget to install it?'
      );
      // remove the stack trace to make the error more readable
      error.stack = undefined;
      throw error;
    }
  }

  private getReanimatedVersion(reanimatedPath: string): SemVer {
    const reanimatedPackageJsonPath = path.join(reanimatedPath, 'package.json');
    const reanimatedPackageJson = require(reanimatedPackageJsonPath);
    const version = semver.parse(reanimatedPackageJson.version);

    if (!version) {
      throw new Error(
        `[RepackReanimatedPlugin] Unable to parse version for react-native-reanimated: ${reanimatedPackageJson.version}`
      );
    }

    return version;
  }
}
