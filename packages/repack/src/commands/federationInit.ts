import fs from 'node:fs';
import path from 'node:path';
import { CLIError } from '../helpers/index.js';
import { getConfigFilePath } from './common/config/getConfigFilePath.js';
import {
  assertStandaloneSupported,
  ConfigFileInvalidError,
  FEDERATION_CONFIG_FILENAME,
  loadFederationConfig,
} from './federation/configFile.js';
import {
  ConfigEvalError,
  extractAppShared,
} from './federation/extractShared.js';
import { applyPlan, printAlignmentReport } from './federation/init/apply.js';
import type { InitPlanInput } from './federation/init/plan.js';
import { computeInitPlan, formatPlanDiff } from './federation/init/plan.js';
import {
  askApplyChanges,
  askDivergenceAction,
  createReadlineAsk,
} from './federation/init/prompt.js';
import { scanFeatureFolder } from './federation/scanFeatures.js';
import type { CliConfig, FederationInitArguments } from './types.js';

/** Same discovery order the rest of the tooling uses: rspack first. */
function discoverHostConfigPath(root: string): string | null {
  try {
    return getConfigFilePath('rspack', root);
  } catch {
    // fall through to webpack candidates
  }
  try {
    return getConfigFilePath('webpack', root);
  } catch {
    return null;
  }
}

/**
 * Scaffold a new Module Federation remote from an existing feature folder:
 * scan its imports, generate versionless rspack/webpack configs built on
 * `defineShared`, and register the remote in its `package.json`, the host's
 * `remotes` and `repack-federation.json`. Everything is planned and diffed
 * before a single write; `--yes` pre-approves the diffs and auto-aligns
 * divergent remote pins to the host.
 *
 * The command is intentionally thin — the plan engine in
 * `federation/init/plan.ts` owns all merge and divergence logic.
 *
 * @param argv Original, non-parsed arguments; the first one is the feature folder.
 * @param cliConfig Configuration object; its `root` locates the workspace.
 * @param args Parsed command line arguments.
 */
export async function federationInit(
  argv: string[],
  cliConfig: CliConfig,
  args: FederationInitArguments
) {
  const fail = (message: string): void => {
    console.error(message);
    process.exit(2);
  };

  const remoteName = args.name?.trim();
  if (!remoteName) {
    fail(
      "Option '--name <remote>' is required: the name of the remote to scaffold."
    );
    return;
  }

  // RN CLI >= 17 hands `argv` the commander-parsed values; an uncaptured
  // optional positional surfaces as the options object, never a path.
  const folderArg = typeof argv[0] === 'string' ? argv[0] : undefined;
  if (!folderArg) {
    fail(
      'No feature folder given: pass the folder to scaffold as the first ' +
        'argument, e.g. react-native federation-init ./features/store ' +
        '--name store.'
    );
    return;
  }
  const featureFolder = path.resolve(process.cwd(), folderArg);
  if (
    !fs.existsSync(featureFolder) ||
    !fs.statSync(featureFolder).isDirectory()
  ) {
    fail(
      `The feature folder ${featureFolder} does not exist — nothing was written.`
    );
    return;
  }

  // Workspace: the config file is the only source of truth here — init
  // refuses without one rather than guessing host roots.
  let loaded: ReturnType<typeof loadFederationConfig>;
  try {
    loaded = loadFederationConfig({ cwd: cliConfig.root });
  } catch (error) {
    if (error instanceof ConfigFileInvalidError) {
      fail(
        `Federation config — ${error.filePath}: ${error.reasons.join('; ')}`
      );
      return;
    }
    throw error;
  }
  if (!loaded) {
    fail(
      `No ${FEDERATION_CONFIG_FILENAME} found from ${cliConfig.root} — run ` +
        'federation-init inside a federation workspace that declares the ' +
        'host and its remotes. Nothing was written.'
    );
    return;
  }
  const { config } = loaded;
  const configDir = path.dirname(loaded.filePath);

  // Standalone enforcement against the targeted entry (before any compute,
  // so the refusal provably performs no writes).
  if (args.standalone) {
    const targeted = config.remotes[remoteName];
    if (targeted) {
      try {
        assertStandaloneSupported(
          path.resolve(configDir, targeted.root ?? '.')
        );
      } catch (error) {
        if (error instanceof CLIError) {
          fail(`${error.message} Nothing was written.`);
          return;
        }
        throw error;
      }
    }
  }

  const hostRoot = config.host.root
    ? path.resolve(configDir, config.host.root)
    : configDir;

  // Host extraction: shared provides + plugin-version mirroring (D4).
  let hostShared: Awaited<ReturnType<typeof extractAppShared>>;
  try {
    hostShared = await extractAppShared(hostRoot);
  } catch (error) {
    if (error instanceof ConfigEvalError) {
      fail(`Federation init — ${error.message}`);
      return;
    }
    throw error;
  }
  const hostConfigPath = discoverHostConfigPath(hostRoot);
  if (hostConfigPath === null) {
    fail(
      `Federation init — no host bundler configuration found in ${hostRoot}; ` +
        'the remotes registration needs one to anchor on. Nothing was written.'
    );
    return;
  }

  const scan = scanFeatureFolder(featureFolder);
  const existingEntry = config.remotes[remoteName];
  const remoteRoot = existingEntry
    ? path.resolve(configDir, existingEntry.root ?? '.')
    : path.join(configDir, 'remotes', remoteName);

  const planInput: InitPlanInput = {
    workspaceRoot: configDir,
    remoteName,
    remoteRoot,
    featureFolder,
    hostRoot,
    hostConfigPath,
    scannedDependencies: scan.dependencies,
    scannedAdvisories: scan.advisories,
    hostSharedProvides: hostShared.shared.map((entry) =>
      entry.name.replace(/\/$/, '')
    ),
    pluginVersion:
      hostShared.pluginName === 'ModuleFederationPluginV2' ? 'V2' : 'V1',
    existingRemotes: Object.entries(config.remotes)
      .filter(([name]) => name !== remoteName)
      .map(([name, entry]) => ({
        name,
        root: path.resolve(configDir, entry.root ?? '.'),
      })),
    standalone: args.standalone === true ? true : undefined,
  };

  let plan = computeInitPlan(planInput);
  // The full printout — diffs, divergence, manual steps, advisories — is
  // shown before any prompt or write: diff-before-write.
  const printed = formatPlanDiff(plan);
  if (printed !== '') console.log(printed);

  if (plan.manualSteps.length > 0 && args.yes) {
    fail(
      '--yes cannot proceed while manual steps remain — the plan above ' +
        'requires human registration the tool will not guess. Nothing was written.'
    );
    return;
  }

  if (plan.divergence.length > 0) {
    if (args.yes) {
      // --yes pre-approves the diffs AND auto-aligns (D7/spec): recompute
      // with alignment so the remote pins land on the host's exact versions.
      plan = computeInitPlan({ ...planInput, align: true });
    } else {
      const action = await askDivergenceAction(createReadlineAsk());
      if (action === 'cancel') {
        console.log('Cancelled — nothing was written.');
        process.exit(1);
        return;
      }
      if (action === 'align') {
        plan = computeInitPlan({ ...planInput, align: true });
      }
    }
  }

  if (plan.files.length === 0) {
    console.log(
      `Nothing to do — remote "${remoteName}" is already registered and its ` +
        'surfaces are current. Review the advisories above if any.'
    );
    return;
  }

  if (!args.yes) {
    const confirmed = await askApplyChanges(
      createReadlineAsk(),
      plan.files.length
    );
    if (!confirmed) {
      console.log('Declined — no files were written.');
      return;
    }
  }

  applyPlan(plan);
  printAlignmentReport(plan);

  console.log(
    `Remote "${remoteName}" scaffolded: ${plan.files.length} file(s) written.`
  );
  if (plan.manualSteps.length > 0) {
    console.log(
      `Manual steps still needed:\n${plan.manualSteps.map((s) => `  - ${s}`).join('\n')}`
    );
  }
  console.log(
    'Dependencies are declared, not installed — run your package manager install (e.g. `pnpm install`) before building.'
  );
}
