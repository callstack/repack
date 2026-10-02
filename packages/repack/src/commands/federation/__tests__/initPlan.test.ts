import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureRemotesEntry } from '../init/merge.js';
import { computeInitPlan } from '../init/plan.js';

const FIXTURE = path.join(__dirname, '..', '__fixtures__', 'init-workspace');

interface PlanLike {
  files: Array<{ path: string; before: string | null; after: string }>;
  manualSteps: string[];
  advisories: string[];
  divergence: Array<{
    remote: string;
    pkg: string;
    hostVersion: string;
    remoteVersion: string;
  }>;
  alignment: Array<{
    remote: string;
    pkg: string;
    from: string;
    to: string;
  }>;
}

function baseInput(root: string, overrides: Record<string, unknown> = {}) {
  return {
    workspaceRoot: root,
    remoteName: 'store',
    remoteRoot: path.join(root, 'remotes', 'store'),
    featureFolder: path.join(root, 'features', 'store'),
    hostRoot: path.join(root, 'apps', 'host'),
    hostConfigPath: path.join(root, 'apps', 'host', 'rspack.config.js'),
    scannedDependencies: [
      '@shopify/flash-list',
      'react',
      'left-pad',
      'react-native',
      'zustand',
    ],
    scannedAdvisories: [],
    hostSharedProvides: [
      '@shopify/flash-list',
      'react',
      'left-pad',
      'react-native',
    ],
    pluginVersion: 'V1' as const,
    existingRemotes: [
      { name: 'remote-drift', root: path.join(root, 'apps', 'remote-drift') },
    ],
    ...overrides,
  };
}

function copyWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-init-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

function applyManually(plan: PlanLike): void {
  for (const file of plan.files) {
    fs.mkdirSync(path.dirname(file.path), { recursive: true });
    fs.writeFileSync(file.path, file.after);
  }
}

function fileFor(root: string, rel: string, plan: PlanLike) {
  const abs = path.resolve(root, rel);
  return plan.files.find((file) => path.resolve(file.path) === abs);
}

let tmp: string;

beforeEach(() => {
  tmp = copyWorkspace();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('computeInitPlan — fresh scaffold', () => {
  it('plans all three registration surfaces plus both bundler configs', () => {
    const plan = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;

    expect(fileFor(tmp, 'remotes/store/package.json', plan)).toMatchObject({
      before: null,
    });
    expect(fileFor(tmp, 'remotes/store/rspack.store.mts', plan)?.before).toBe(
      null
    );
    expect(fileFor(tmp, 'remotes/store/webpack.store.mts', plan)?.before).toBe(
      null
    );
    // Host surgery and workspace-map registration carry before content.
    expect(fileFor(tmp, 'apps/host/rspack.config.js', plan)?.before).toContain(
      'remotes: {'
    );
    expect(fileFor(tmp, 'repack-federation.json', plan)?.before).toContain(
      'remote-drift'
    );
  });

  it('remote package.json deps are scan ∩ host provides at host versions', () => {
    const plan = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    const pkg = fileFor(tmp, 'remotes/store/package.json', plan);
    const written = JSON.parse(pkg?.after ?? '{}') as {
      name: string;
      dependencies: Record<string, string>;
    };

    // Installed pin wins over the declared range (flash-list declares 2.0.0,
    // installs 9.9.9); declared version is the fallback when the package is
    // not resolvable (left-pad → declared 1.3.3).
    expect(written.dependencies).toEqual({
      '@shopify/flash-list': '9.9.9',
      react: '9.9.9',
      'left-pad': '1.3.3',
      'react-native': '9.9.9',
    });
    expect(written.name).toBe('store');
  });

  it('advises about scanned deps the host does not share instead of writing them', () => {
    const plan = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    const pkg = fileFor(tmp, 'remotes/store/package.json', plan);

    expect(pkg?.after).not.toContain('zustand');
    expect(plan.advisories.some((a) => a.includes('"zustand"'))).toBe(true);
  });

  it('registers the remote in repack-federation.json without touching other entries', () => {
    const plan = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    const config = fileFor(tmp, 'repack-federation.json', plan);
    const written = JSON.parse(config?.after ?? '{}') as {
      remotes: Record<string, Record<string, unknown>>;
    };

    expect(written.remotes.store).toEqual({
      manifest: 'remotes/store/build',
      root: 'remotes/store',
    });
    expect(written.remotes['remote-drift']).toEqual({
      manifest: 'apps/remote-drift/build',
      root: 'apps/remote-drift',
    });
  });

  it('carries standalone: true into the new workspace entry when requested', () => {
    const plan = computeInitPlan(
      baseInput(tmp, { standalone: true })
    ) as unknown as PlanLike;
    const config = fileFor(tmp, 'repack-federation.json', plan);
    const written = JSON.parse(config?.after ?? '{}') as {
      remotes: Record<string, Record<string, unknown>>;
    };

    expect(written.remotes.store.standalone).toBe(true);
  });

  it('surgically extends the host remotes block, keeping manual content', () => {
    const plan = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    const host = fileFor(tmp, 'apps/host/rspack.config.js', plan);

    expect(host?.after).toContain("'store': 'store@store/remoteEntry.js'");
    expect(host?.after).toContain(
      "'remote-drift': 'remote-drift@remote-drift/remoteEntry.js'"
    );
  });

  it('produces versionless configs for both bundlers with the remote role and derived mode', () => {
    const plan = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    const rspack = fileFor(tmp, 'remotes/store/rspack.store.mts', plan)?.after;
    const webpack = fileFor(
      tmp,
      'remotes/store/webpack.store.mts',
      plan
    )?.after;

    for (const content of [rspack, webpack]) {
      expect(content).toBeDefined();
      expect(content).toContain('Repack.defineShared(SHARED_DEPS');
      expect(content).toContain("role: 'remote'");
      expect(content).toContain(
        "mode: env.argv?.standalone ? 'standalone' : 'federated'"
      );
      expect(content).toContain('const SHARED_DEPS = [');
      // Versionless assertion: no x.y.z pin anywhere in the generated config.
      expect(content).not.toMatch(/["'][0-9]+\.[0-9]+\.[0-9]+["']/);
    }
    expect(rspack).toContain('defineRspackConfig');
    expect(webpack).toContain('defineWebpackConfig');
  });

  it('mirrors the host plugin version into the generated configs', () => {
    const plan = computeInitPlan(
      baseInput(tmp, { pluginVersion: 'V2' })
    ) as unknown as PlanLike;

    const rspack = fileFor(tmp, 'remotes/store/rspack.store.mts', plan)?.after;
    const webpack = fileFor(
      tmp,
      'remotes/store/webpack.store.mts',
      plan
    )?.after;
    expect(rspack).toContain('ModuleFederationPluginV2');
    expect(rspack).not.toContain('ModuleFederationPluginV1');
    expect(webpack).toContain('ModuleFederationPluginV2');
  });

  it('carries scanner advisories into the plan', () => {
    const plan = computeInitPlan(
      baseInput(tmp, {
        scannedAdvisories: [
          'index.tsx:7 — dynamic import() cannot be resolved',
        ],
      })
    ) as unknown as PlanLike;

    expect(plan.advisories).toContainEqual(
      'index.tsx:7 — dynamic import() cannot be resolved'
    );
  });
});

describe('computeInitPlan — idempotent, edit-safe re-runs', () => {
  it('re-runs on the post-apply state with an empty file list', () => {
    const first = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    applyManually(first);

    const second = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;

    expect(second.files).toEqual([]);
    expect(second.manualSteps).toEqual([]);
  });

  it('never duplicates keys when a merge is forced over post-apply content', () => {
    const first = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    applyManually(first);

    const after = fs.readFileSync(
      path.join(tmp, 'repack-federation.json'),
      'utf-8'
    );
    // The name appears exactly once as a key in the merged document.
    expect(after.match(/"store":/g)).toHaveLength(1);
    const hostAfter = fs.readFileSync(
      path.join(tmp, 'apps', 'host', 'rspack.config.js'),
      'utf-8'
    );
    expect(hostAfter.match(/'store':/g)).toHaveLength(1);
  });

  it('keeps manual edits byte-present and proposes only genuinely missing additions', () => {
    const first = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    applyManually(first);

    // Manual edits a human might actually make:
    const pkgPath = path.join(tmp, 'remotes', 'store', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      dependencies: Record<string, string>;
    };
    pkg.dependencies.nanoid = '5.0.0';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

    const hostPath = path.join(tmp, 'apps', 'host', 'rspack.config.js');
    const hostSource = fs.readFileSync(hostPath, 'utf-8');
    fs.writeFileSync(
      hostPath,
      hostSource.replace(
        "'store': 'store@store/remoteEntry.js',",
        "'store': 'store@store/remoteEntry.js',\n        'catalog': 'catalog@catalog/remoteEntry.js',"
      )
    );

    const second = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    expect(second.files).toEqual([]);

    const keptPkg = fs.readFileSync(pkgPath, 'utf-8');
    expect(keptPkg).toContain('"nanoid": "5.0.0"');
    const keptHost = fs.readFileSync(hostPath, 'utf-8');
    expect(keptHost).toContain("'catalog': 'catalog@catalog/remoteEntry.js'");
  });

  it('treats an existing remote config as create-only and advises about missing deps', () => {
    const first = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    applyManually(first);

    // A manually added dependency appears in the scan but not the config.
    const second = computeInitPlan(
      baseInput(tmp, {
        scannedDependencies: [
          '@shopify/flash-list',
          'react',
          'left-pad',
          'react-native',
          'zustand',
        ],
        hostSharedProvides: [
          '@shopify/flash-list',
          'react',
          'left-pad',
          'react-native',
        ],
      })
    ) as unknown as PlanLike;

    expect(
      fileFor(tmp, 'remotes/store/rspack.store.mts', second)
    ).toBeUndefined();
    expect(
      fileFor(tmp, 'remotes/store/webpack.store.mts', second)
    ).toBeUndefined();

    // Now manually remove left-pad from the generated SHARED_DEPS list:
    const cfgPath = path.join(tmp, 'remotes', 'store', 'rspack.store.mts');
    const cfg = fs.readFileSync(cfgPath, 'utf-8');
    fs.writeFileSync(cfgPath, cfg.replace("  'left-pad',\n", ''));

    const third = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;
    expect(
      fileFor(tmp, 'remotes/store/rspack.store.mts', third)
    ).toBeUndefined();
    expect(
      third.advisories.some(
        (a) => a.includes('rspack.store.mts') && a.includes('left-pad')
      )
    ).toBe(true);
  });
});

describe('computeInitPlan — divergence', () => {
  it('computes host-vs-existing-remote installed-version divergence', () => {
    const plan = computeInitPlan(baseInput(tmp)) as unknown as PlanLike;

    // react: host 9.9.9 vs remote-drift 9.8.7. react-native resolves to
    // 9.9.9 on both sides, so no divergence may be claimed for it.
    expect(plan.divergence).toEqual([
      {
        remote: 'remote-drift',
        pkg: 'react',
        hostVersion: '9.9.9',
        remoteVersion: '9.8.7',
      },
    ]);
    // Without --yes alignment is a question, not a write.
    expect(
      fileFor(tmp, 'apps/remote-drift/package.json', plan)
    ).toBeUndefined();
    expect(plan.alignment).toEqual([]);
  });

  it('align=true rewrites divergent remote pins to exact host versions with an old→new report', () => {
    const plan = computeInitPlan(
      baseInput(tmp, { align: true })
    ) as unknown as PlanLike;
    const drift = fileFor(tmp, 'apps/remote-drift/package.json', plan);

    expect(drift).toBeDefined();
    const written = JSON.parse(drift?.after ?? '{}') as {
      dependencies: Record<string, string>;
    };
    // Exact installed host version, no caret range.
    expect(written.dependencies.react).toBe('9.9.9');
    // Untouched deps survive the pin rewrite.
    expect(written.dependencies['react-native']).toBe('9.9.9');
    expect(plan.alignment).toEqual([
      { remote: 'remote-drift', pkg: 'react', from: '^9.8.7', to: '9.9.9' },
    ]);
  });
});

describe('ensureRemotesEntry — host surgery anchors', () => {
  const pluginBlock = (options: string) => `
export default () => ({
  plugins: [
    new Repack.plugins.ModuleFederationPluginV1({
${options}
    }),
  ],
});
`;

  it('adds the key to an existing remotes block', () => {
    const source = pluginBlock(`      name: 'HostApp',
      remotes: {
        'a': 'a@a/remoteEntry.js',
      },`);
    const result = ensureRemotesEntry(
      source,
      'store',
      'store@store/remoteEntry.js'
    );

    expect(result.changed).toBe(true);
    expect(result.after).toContain("'store': 'store@store/remoteEntry.js'");
    expect(result.after).toContain("'a': 'a@a/remoteEntry.js'");
    // Idempotent: a second run finds the key and changes nothing.
    const again = ensureRemotesEntry(
      result.after as string,
      'store',
      'store@store/remoteEntry.js'
    );
    expect(again.changed).toBe(false);
    expect(again.after).toBe(result.after);
  });

  it('inserts a remotes property after name: when none exists', () => {
    const source = pluginBlock(`      name: 'HostApp',
      shared: {},`);
    const result = ensureRemotesEntry(
      source,
      'store',
      'store@store/remoteEntry.js'
    );

    expect(result.changed).toBe(true);
    expect(result.after).toContain('remotes: {');
    expect(result.after).toContain("'store': 'store@store/remoteEntry.js'");
    // The insertion point is anchored after the name property.
    const after = result.after as string;
    expect(after.indexOf('name:')).toBeLessThan(after.indexOf('remotes: {'));
    expect(after.indexOf('remotes: {')).toBeLessThan(
      after.indexOf('shared: {}')
    );
  });

  it('degrades to a manual step when no plugin block can be anchored', () => {
    const noPlugin = 'export default () => ({ plugins: [] });';
    const result = ensureRemotesEntry(noPlugin, 'store', 'x');

    expect(result.changed).toBe(false);
    expect(result.manualStep).toContain('remotes');
    expect(result.after ?? noPlugin).toBe(noPlugin);
  });

  it('degrades to a manual step when two plugin instances make the anchor ambiguous', () => {
    const source =
      pluginBlock(`      name: 'HostApp',`) +
      pluginBlock(`      name: 'OtherApp',`);
    const result = ensureRemotesEntry(source, 'store', 'x');

    expect(result.changed).toBe(false);
    expect(result.manualStep).toMatch(/two|multiple/i);
  });

  it('degrades to a manual step when the options object has neither remotes nor name', () => {
    const source = pluginBlock(`      shared: {},`);
    const result = ensureRemotesEntry(source, 'store', 'x');

    expect(result.changed).toBe(false);
    expect(result.manualStep).toBeDefined();
  });

  it('never anchors on the word remotes inside a string value', () => {
    const source = pluginBlock(`      name: 'HostApp',
      // remotes: { inside a comment }
      shared: { 'remotes-pkg': {} },`);
    const result = ensureRemotesEntry(
      source,
      'store',
      'store@store/remoteEntry.js'
    );

    expect(result.changed).toBe(true);
    const after = result.after as string;
    // The insertion went after name:, not into the comment or the shared map.
    expect(after.indexOf('remotes: {')).toBeLessThan(
      after.indexOf("shared: { 'remotes-pkg'")
    );
  });
});
