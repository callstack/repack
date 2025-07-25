import path from 'node:path';
import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import { createReanimatedModuleRules } from './rules.js';

export class ReanimatedPlugin {
  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    const reanimatedPath = this.ensureDependencyInstalled(
      compiler.context,
      'react-native-reanimated'
    );

    const reanimatedVersion = this.getReanimatedVersion(reanimatedPath);

    // add rules for transpiling wih reanimated loader
    compiler.options.module.rules.push(
      createReanimatedModuleRules(reanimatedVersion.major)
    );

    // ignore the 'setUpTests' warning from reanimated which is not relevant
    compiler.options.ignoreWarnings = compiler.options.ignoreWarnings ?? [];
    compiler.options.ignoreWarnings.push((warning) =>
      /'`setUpTests` is available only in Jest environment\.'/.test(
        warning.message
      )
    );
  }

  private ensureDependencyInstalled(context: string, dependency: string) {
    try {
      const dependencyPath = require.resolve(dependency, { paths: [context] });
      return dependencyPath;
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

  private getReanimatedVersion(reanimatedPath: string) {
    const reanimatedPackageJsonPath = path.join(reanimatedPath, 'package.json');
    const reanimatedPackageJson = require(reanimatedPackageJsonPath);
    const [major, minor, patch] = reanimatedPackageJson.version
      .split('-')[0]
      .split('.');
    return {
      major: Number.parseInt(major, 10),
      minor: Number.parseInt(minor, 10),
      patch: Number.parseInt(patch, 10),
    };
  }
}
