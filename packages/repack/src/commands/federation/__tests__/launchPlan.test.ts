import path from 'node:path';
import type { PlannedApp } from '../devPlan.js';
import { buildLaunchPlan } from '../launchPlan.js';

// Only the fields the launch target reads: roots, role, standalone mark.
const app = (
  name: string,
  root: string,
  role: 'host' | 'remote',
  standalone = false
): PlannedApp =>
  ({ name, role, root, ...(standalone ? { standalone } : {}) }) as PlannedApp;

const cliForRoot = (root: string) => path.join(root, 'node_modules', 'cli.js');

const hostRoot = '/workspace/app';
const miniRoot = '/workspace/miniapp';
const plan = [
  app('host', hostRoot, 'host'),
  app('MiniApp', miniRoot, 'remote'),
];

describe('buildLaunchPlan', () => {
  it('targets the host root with run-ios and the host CLI, --no-packager always', () => {
    const launch = buildLaunchPlan({
      plan,
      platform: 'ios',
      rnCliForRoot: cliForRoot,
    });
    expect(launch.triggerApp).toBe('host');
    expect(launch.root).toBe(hostRoot);
    // Same execa discipline as the supervisor: process.execPath head, the
    // target root's OWN react-native CLI next.
    expect(launch.file).toBe(process.execPath);
    expect(launch.args).toEqual([
      cliForRoot(hostRoot),
      'run-ios',
      '--no-packager',
    ]);
    expect(launch.cwd).toBe(hostRoot);
  });

  it('run-android on android, and --device passes through verbatim', () => {
    const launch = buildLaunchPlan({
      plan,
      platform: 'android',
      device: 'emulator-5554',
      rnCliForRoot: cliForRoot,
    });
    expect(launch.args).toEqual([
      cliForRoot(hostRoot),
      'run-android',
      '--no-packager',
      '--device',
      'emulator-5554',
    ]);
  });

  it('a standalone session launches the standalone remote with ITS own CLI', () => {
    // The standalone remote serves the app alone, so the app must be built
    // against the remote's project — root, CLI and cwd all follow it.
    const standalonePlan = [
      app('host', hostRoot, 'host'),
      app('MiniApp', miniRoot, 'remote', true),
    ];
    const launch = buildLaunchPlan({
      plan: standalonePlan,
      platform: 'ios',
      rnCliForRoot: cliForRoot,
    });
    expect(launch.triggerApp).toBe('MiniApp');
    expect(launch.root).toBe(miniRoot);
    expect(launch.cwd).toBe(miniRoot);
    expect(launch.args).toContain(cliForRoot(miniRoot));
    expect(launch.args).not.toContain(cliForRoot(hostRoot));
  });

  it('a hostile device id stays one exact argv entry, never shell-split', () => {
    // Threat row "Subprocess spawn": passthrough with zero interpretation.
    const launch = buildLaunchPlan({
      plan,
      platform: 'android',
      device: 'x; rm -rf /',
      rnCliForRoot: cliForRoot,
    });
    const deviceIndex = launch.args.indexOf('--device');
    expect(launch.args[deviceIndex + 1]).toBe('x; rm -rf /');
  });
});
