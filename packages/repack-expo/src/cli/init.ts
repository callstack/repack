import fs from 'node:fs';
import path from 'node:path';
import {
  addDependencyCommand,
  CONFIG_PLUGIN,
  dependencyRanges,
  detectPackageManager,
  diagnosticError,
  dynamicExpoConfig,
  getConfigPluginRegistration,
  hasDependency,
  installCommand,
  REQUIRED_DEV_DEPENDENCIES,
  REQUIRED_SCRIPTS,
  RSPACK_COMMANDS,
  RSPACK_CONFIG_NAMES,
  readJson,
  stringifyJson,
  writeFilesAtomically,
} from './project.js';
import { isRspackConfigCompatible } from './rspackConfig.js';
import type {
  ConfigPluginOptions,
  Diagnostic,
  InitOptions,
  InitResult,
  JsonObject,
  PackageJson,
} from './types.js';

function rspackConfig(
  packageName: string,
  configPath: string,
  packageType?: string
): string {
  const uniqueName = packageName.replace(/[^a-zA-Z0-9_-]/g, '-') || 'expo-app';
  const rootFromConfig = path.relative(path.dirname(configPath), '.') || '.';
  const commonJs =
    /\.(?:cjs|cts)$/.test(configPath) ||
    (configPath.endsWith('.js') && packageType !== 'module');
  if (commonJs) {
    return `const path = require('node:path');
const { ExpoPlugin } = require('@callstack/repack-expo/rspack');

const projectRoot = path.resolve(__dirname, ${JSON.stringify(rootFromConfig)});

module.exports = (env) => createConfig(env, projectRoot);

function createConfig(env, projectRoot) {
  const { entry, mode = 'development', platform = process.env.PLATFORM, devServer } = env;

  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('ExpoPlugin requires PLATFORM=ios or android');
  }

  return {
    context: projectRoot,
    devServer,
    mode,
    name: platform,
    output: {
      clean: true,
      path: path.join(projectRoot, 'build', 'rspack', platform),
      uniqueName: ${JSON.stringify(uniqueName)},
    },
    plugins: [new ExpoPlugin({ entry, platform })],
  };
}
`;
  }
  return `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ${JSON.stringify(rootFromConfig)}
);

export default (env) => {
  const { entry, mode = 'development', platform = process.env.PLATFORM, devServer } = env;

  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('ExpoPlugin requires PLATFORM=ios or android');
  }

  return {
    context: projectRoot,
    devServer,
    mode,
    name: platform,
    output: {
      clean: true,
      path: path.join(projectRoot, 'build', 'rspack', platform),
      uniqueName: ${JSON.stringify(uniqueName)},
    },
    plugins: [new ExpoPlugin({ entry, platform })],
  };
};
`;
}

function addConfigPlugin(expo: JsonObject): {
  diagnostic?: Diagnostic;
  options: ConfigPluginOptions;
} {
  if (expo.plugins === undefined) expo.plugins = [];
  if (!Array.isArray(expo.plugins)) {
    return {
      diagnostic: diagnosticError(
        'EXPO_CONFIG_PLUGINS_INVALID',
        'Expo config "plugins" must be an array before init can update it.',
        `Add ${JSON.stringify(CONFIG_PLUGIN)} to the Expo plugins array manually.`
      ),
      options: {},
    };
  }
  const registration = getConfigPluginRegistration(expo);
  if (registration.invalidReason) {
    return {
      diagnostic: diagnosticError(
        'CONFIG_PLUGIN_OPTIONS_INVALID',
        registration.invalidReason,
        'Keep one valid Re.Pack Expo Config Plugin registration.'
      ),
      options: {},
    };
  }
  if (!registration.registered) expo.plugins.push(CONFIG_PLUGIN);
  return { options: registration.options };
}

function disableExpoUpdates(expo: JsonObject): Diagnostic | undefined {
  if (expo.updates === undefined) {
    expo.updates = { enabled: false };
    return undefined;
  }
  if (
    !expo.updates ||
    typeof expo.updates !== 'object' ||
    Array.isArray(expo.updates)
  ) {
    return diagnosticError(
      'EXPO_UPDATES_CONFLICT',
      'Expo config has an unsupported explicit updates value.',
      'Preserve the Updates config and set expo.updates.enabled to false manually.'
    );
  }
  const updates = expo.updates as JsonObject;
  if (updates.enabled === undefined) {
    updates.enabled = false;
    return undefined;
  }
  if (updates.enabled !== false) {
    return diagnosticError(
      'EXPO_UPDATES_CONFLICT',
      'Expo config explicitly enables Expo Updates.',
      'Set expo.updates.enabled to false before running init.'
    );
  }
  return undefined;
}

function normalizeExpoRuntimeDefaults(expo: JsonObject): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (expo.newArchEnabled === true) {
    delete expo.newArchEnabled;
  } else if (expo.newArchEnabled !== undefined) {
    diagnostics.push(
      diagnosticError(
        'EXPO_NEW_ARCH_CONFLICT',
        'Expo config explicitly disables React Native New Architecture.',
        'Remove expo.newArchEnabled; Expo SDK 56+ enables New Architecture by default.'
      )
    );
  }

  if (expo.jsEngine === 'hermes') {
    delete expo.jsEngine;
  } else if (expo.jsEngine !== undefined) {
    diagnostics.push(
      diagnosticError(
        'EXPO_JS_ENGINE_CONFLICT',
        'Expo config explicitly selects a non-Hermes JavaScript engine.',
        'Remove expo.jsEngine; Expo SDK 56+ uses Hermes by default.'
      )
    );
  }
  return diagnostics;
}

function planReactNativeConfig(
  projectRoot: string,
  diagnostics: Diagnostic[]
): string | undefined {
  const filePath = path.join(projectRoot, 'react-native.config.js');
  if (!fs.existsSync(filePath)) {
    return `module.exports = {\n  commands: require('${RSPACK_COMMANDS}'),\n};\n`;
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  if (contents.includes(RSPACK_COMMANDS)) return contents;
  if (/commands\s*:/.test(contents)) {
    diagnostics.push(
      diagnosticError(
        'RN_COMMANDS_CONFLICT',
        'react-native.config.js already registers a different commands implementation.',
        `Merge commands from require('${RSPACK_COMMANDS}') manually.`
      )
    );
    return undefined;
  }
  if (/module\.exports\s*=\s*\{/.test(contents)) {
    return contents.replace(
      /module\.exports\s*=\s*\{/,
      `module.exports = {\n  commands: require('${RSPACK_COMMANDS}'),`
    );
  }
  diagnostics.push(
    diagnosticError(
      'RN_CONFIG_AMBIGUOUS',
      'react-native.config.js cannot be updated safely.',
      `Register commands from require('${RSPACK_COMMANDS}') manually.`
    )
  );
  return undefined;
}

export function runInit(options: InitOptions = {}): InitResult {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const diagnostics: Diagnostic[] = [];
  const packagePath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packagePath)) {
    const packageManager = detectPackageManager(projectRoot);
    return {
      changes: [],
      changedFiles: [],
      diagnostics: [
        diagnosticError(
          'PACKAGE_JSON_MISSING',
          `No package.json was found at ${projectRoot}.`,
          'Run the command from an Expo application root.'
        ),
      ],
      installCommand: installCommand(packageManager),
      ok: false,
      packageManager,
      wrote: false,
    };
  }

  let packageJson: PackageJson;
  let packageOriginal: string;
  try {
    packageOriginal = fs.readFileSync(packagePath, 'utf8');
    packageJson = readJson(packagePath) as PackageJson;
  } catch (cause) {
    const packageManager = detectPackageManager(projectRoot);
    return {
      changes: [],
      changedFiles: [],
      diagnostics: [
        diagnosticError(
          'PACKAGE_JSON_INVALID',
          cause instanceof Error ? cause.message : String(cause),
          'Repair package.json and run init again.'
        ),
      ],
      installCommand: installCommand(packageManager),
      ok: false,
      packageManager,
      wrote: false,
    };
  }
  const packageManager = detectPackageManager(projectRoot, packageJson);

  if (!hasDependency(packageJson, 'expo')) {
    diagnostics.push(
      diagnosticError(
        'EXPO_DEPENDENCY_MISSING',
        'package.json does not declare Expo.',
        'Run init from an Expo application root.'
      )
    );
  }

  const dynamicConfig = dynamicExpoConfig(projectRoot);
  if (dynamicConfig) {
    diagnostics.push(
      diagnosticError(
        'DYNAMIC_EXPO_CONFIG',
        `${dynamicConfig} may contain executable configuration and will not be rewritten.`,
        `Add ${JSON.stringify(CONFIG_PLUGIN)} and the supported engine, architecture, and Updates settings manually.`
      )
    );
  }

  const appJsonPath = path.join(projectRoot, 'app.json');
  let appOriginal: string | undefined;
  let appJson: JsonObject | undefined;
  let expo: JsonObject | undefined;
  let configPluginOptions: ConfigPluginOptions = {};
  if (!dynamicConfig && fs.existsSync(appJsonPath)) {
    try {
      appOriginal = fs.readFileSync(appJsonPath, 'utf8');
      appJson = readJson(appJsonPath);
      if (
        !appJson.expo ||
        typeof appJson.expo !== 'object' ||
        Array.isArray(appJson.expo)
      ) {
        diagnostics.push(
          diagnosticError(
            'EXPO_CONFIG_INVALID',
            'app.json does not contain an Expo config object.',
            'Add a top-level "expo" object and run init again.'
          )
        );
      } else {
        expo = appJson.expo as JsonObject;
      }
    } catch (cause) {
      diagnostics.push(
        diagnosticError(
          'EXPO_CONFIG_INVALID',
          cause instanceof Error ? cause.message : String(cause),
          'Repair app.json and run init again.'
        )
      );
    }
  } else if (!dynamicConfig && packageJson.expo !== undefined) {
    if (
      !packageJson.expo ||
      typeof packageJson.expo !== 'object' ||
      Array.isArray(packageJson.expo)
    ) {
      diagnostics.push(
        diagnosticError(
          'EXPO_CONFIG_INVALID',
          'package.json#expo must contain an object.',
          'Replace package.json#expo with a valid Expo config object.'
        )
      );
    } else {
      expo = packageJson.expo;
    }
  } else if (!dynamicConfig) {
    diagnostics.push(
      diagnosticError(
        'EXPO_CONFIG_MISSING',
        'No static Expo app config was found.',
        'Create app.json or a package.json#expo object and run init again.'
      )
    );
  }

  if (expo) {
    const plugin = addConfigPlugin(expo);
    configPluginOptions = plugin.options;
    const configDiagnostics = [
      plugin.diagnostic,
      ...normalizeExpoRuntimeDefaults(expo),
      disableExpoUpdates(expo),
    ].filter((item): item is Diagnostic => item !== undefined);
    diagnostics.push(...configDiagnostics);
  }

  packageJson.scripts ??= {};
  for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
    const current = packageJson.scripts[name];
    if (current && current !== command) {
      diagnostics.push(
        diagnosticError(
          'PACKAGE_SCRIPT_CONFLICT',
          `package.json script ${JSON.stringify(name)} already has an explicit command.`,
          `Preserve it or change it to ${JSON.stringify(command)} before running init.`
        )
      );
    } else {
      packageJson.scripts[name] = command;
    }
  }
  packageJson.devDependencies ??= {};
  const ranges = dependencyRanges();
  const dependenciesToAdd: string[] = [];
  for (const dependency of REQUIRED_DEV_DEPENDENCIES) {
    if (!hasDependency(packageJson, dependency)) {
      const range = ranges[dependency];
      if (range) packageJson.devDependencies[dependency] = range;
      else dependenciesToAdd.push(dependency);
    }
  }
  if (dependenciesToAdd.length > 0) {
    diagnostics.push({
      code: 'DEPENDENCIES_REQUIRE_INSTALL',
      message: `Required dependencies need a project-compatible version: ${dependenciesToAdd.join(', ')}.`,
      recovery: addDependencyCommand(packageManager, dependenciesToAdd),
      severity: 'info',
    });
  }

  const rnConfig = planReactNativeConfig(projectRoot, diagnostics);
  const configuredRspackName = configPluginOptions.configPath;
  const existingRspackNames = configuredRspackName
    ? fs.existsSync(path.resolve(projectRoot, configuredRspackName))
      ? [configuredRspackName]
      : []
    : RSPACK_CONFIG_NAMES.filter((name) =>
        fs.existsSync(path.join(projectRoot, name))
      );
  const rspackName =
    configuredRspackName ?? existingRspackNames[0] ?? 'rspack.config.mjs';
  const rspackPath = path.resolve(projectRoot, rspackName);
  const relativeRspackPath = path.relative(
    projectRoot,
    path.resolve(rspackPath)
  );
  if (
    relativeRspackPath.startsWith('..') ||
    path.isAbsolute(relativeRspackPath)
  ) {
    diagnostics.push(
      diagnosticError(
        'RSPACK_CONFIG_OUTSIDE_PROJECT',
        `Config Plugin configPath resolves outside the Expo project: ${rspackName}.`,
        'Use a project-relative configPath inside the Expo application.'
      )
    );
  }
  const generatedRspack = rspackConfig(
    packageJson.name ?? 'expo-app',
    relativeRspackPath,
    packageJson.type
  );
  let rspackContents = generatedRspack;
  if (existingRspackNames.length > 1) {
    diagnostics.push(
      diagnosticError(
        'RSPACK_CONFIG_AMBIGUOUS',
        `Multiple Rspack configs were found: ${existingRspackNames.join(', ')}.`,
        'Keep one Rspack config and rerun init.'
      )
    );
  } else if (fs.existsSync(rspackPath)) {
    const existing = fs.readFileSync(rspackPath, 'utf8');
    if (isRspackConfigCompatible(existing)) {
      rspackContents = existing;
    } else if (!options.force) {
      diagnostics.push(
        diagnosticError(
          'RSPACK_CONFIG_CONFLICT',
          `Existing ${rspackName} is not a supported ExpoPlugin configuration.`,
          `Update it manually, or rerun init with --force to replace ${rspackName}.`
        )
      );
      rspackContents = existing;
    }
  }

  if (diagnostics.some((item) => item.severity === 'error')) {
    return {
      changes: [],
      changedFiles: [],
      diagnostics,
      installCommand: installCommand(packageManager),
      ok: false,
      packageManager,
      wrote: false,
    };
  }

  const planned = new Map<string, string>();
  planned.set('package.json', stringifyJson(packageJson, packageOriginal));
  if (appJson && appOriginal !== undefined) {
    planned.set('app.json', stringifyJson(appJson, appOriginal));
  }
  planned.set('react-native.config.js', rnConfig as string);
  planned.set(relativeRspackPath, rspackContents);
  const changes = [...planned].flatMap(([relativePath, contents]) => {
    const filePath = path.join(projectRoot, relativePath);
    return !fs.existsSync(filePath) ||
      fs.readFileSync(filePath, 'utf8') !== contents
      ? [
          {
            after: contents,
            before: fs.existsSync(filePath)
              ? fs.readFileSync(filePath, 'utf8')
              : null,
            path: relativePath,
          },
        ]
      : [];
  });
  const changedFiles = changes.map((change) => change.path);
  const shouldWrite = !options.check && !options.dryRun;
  if (shouldWrite) {
    writeFilesAtomically(projectRoot, planned, changedFiles);
  }
  return {
    changes,
    changedFiles,
    diagnostics,
    installCommand: addDependencyCommand(packageManager, dependenciesToAdd),
    ok: !options.check || changedFiles.length === 0,
    packageManager,
    wrote: shouldWrite && changedFiles.length > 0,
  };
}
