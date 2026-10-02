import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyPlan, printAlignmentReport } from '../init/apply.js';
import type { InitPlan } from '../init/plan.js';
import { computeInitPlan, formatPlanDiff } from '../init/plan.js';
import { askApplyChanges, askDivergenceAction } from '../init/prompt.js';

const FIXTURE = path.join(__dirname, '..', '__fixtures__', 'init-workspace');

function baseInput(root: string, overrides: Record<string, unknown> = {}) {
  return {
    workspaceRoot: root,
    remoteName: 'store',
    remoteRoot: path.join(root, 'remotes', 'store'),
    featureFolder: path.join(root, 'features', 'store'),
    hostRoot: path.join(root, 'apps', 'host'),
    hostConfigPath: path.join(root, 'apps', 'host', 'rspack.config.js'),
    scannedDependencies: ['left-pad', 'react', 'react-native'],
    scannedAdvisories: [],
    hostSharedProvides: ['left-pad', 'react', 'react-native'],
    pluginVersion: 'V1' as const,
    existingRemotes: [
      { name: 'remote-drift', root: path.join(root, 'apps', 'remote-drift') },
    ],
    ...overrides,
  };
}

function copyWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-init-apply-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

function hashTree(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.set(full, fs.readFileSync(full, 'utf-8'));
    }
  };
  walk(dir);
  return files;
}

function fakeAsk(answers: string[]) {
  let index = 0;
  const questions: string[] = [];
  const ask = async (question: string) => {
    questions.push(question);
    return answers[index++] ?? '';
  };
  return { ask, questions };
}

let tmp: string;

beforeEach(() => {
  tmp = copyWorkspace();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('applyPlan — writes exactly the plan, after confirmation', () => {
  it('writes exactly plan.files and nothing else', () => {
    const plan = computeInitPlan(baseInput(tmp));
    const before = hashTree(tmp);

    applyPlan(plan);

    const after = hashTree(tmp);
    const planned = new Set(plan.files.map((file) => path.resolve(file.path)));
    for (const [file, content] of before) {
      if (!planned.has(path.resolve(file))) {
        expect(after.get(file)).toBe(content);
      }
    }
    for (const file of plan.files) {
      expect(after.get(path.resolve(file.path))).toBe(file.after);
    }
    // Nothing appeared outside the plan.
    const additions = [...after.keys()].filter(
      (f) => !before.has(f) && !planned.has(path.resolve(f))
    );
    expect(additions).toEqual([]);
    expect(plan.files.length).toBeGreaterThan(0);
  });

  it('materializes both bundler configs on disk, versionless, mirroring the host plugin', () => {
    applyPlan(computeInitPlan(baseInput(tmp)));

    for (const bundler of ['rspack', 'webpack']) {
      const configPath = path.join(
        tmp,
        'remotes',
        'store',
        `${bundler}.store.mts`
      );
      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('Repack.defineShared(SHARED_DEPS');
      expect(content).toContain("role: 'remote'");
      expect(content).toContain(
        "mode: env.argv?.standalone ? 'standalone' : 'federated'"
      );
      expect(content).toContain('ModuleFederationPluginV1');
      // Versionless assertion on the file as written.
      expect(content).not.toMatch(/["'][0-9]+\.[0-9]+\.[0-9]+["']/);
    }
  });

  it('is idempotent through the real write path', () => {
    applyPlan(computeInitPlan(baseInput(tmp)));
    const afterFirst = hashTree(tmp);

    const second = computeInitPlan(baseInput(tmp));
    expect(second.files).toEqual([]);
    applyPlan(second);

    const afterSecond = hashTree(tmp);
    expect([...afterSecond.keys()].sort()).toEqual(
      [...afterFirst.keys()].sort()
    );
    for (const [file, content] of afterFirst) {
      expect(afterSecond.get(file)).toBe(content);
    }
  });

  it('apply of an align plan rewrites remote pins on disk', () => {
    const plan = computeInitPlan(baseInput(tmp, { align: true }));
    applyPlan(plan);

    const drift = JSON.parse(
      fs.readFileSync(
        path.join(tmp, 'apps', 'remote-drift', 'package.json'),
        'utf-8'
      )
    ) as { dependencies: Record<string, string> };
    expect(drift.dependencies.react).toBe('9.9.9');
  });

  it('declining the confirmation means apply is never called and the tree is untouched', async () => {
    const plan = computeInitPlan(baseInput(tmp));
    const before = hashTree(tmp);

    const { ask } = fakeAsk(['n']);
    const confirmed = await askApplyChanges(ask, plan.files.length);

    // The command only calls applyPlan when confirmed — the engine contract:
    // a decline produces no writes at all.
    expect(confirmed).toBe(false);
    const after = hashTree(tmp);
    for (const [file, content] of before) {
      expect(after.get(file)).toBe(content);
    }
  });
});

describe('prompt decisions — injected readline stubs', () => {
  it('apply confirms only on y/yes and defaults to N', async () => {
    await expect(askApplyChanges(fakeAsk(['y']).ask, 3)).resolves.toBe(true);
    await expect(askApplyChanges(fakeAsk(['Y']).ask, 3)).resolves.toBe(true);
    await expect(askApplyChanges(fakeAsk(['yes']).ask, 3)).resolves.toBe(true);
    await expect(askApplyChanges(fakeAsk(['']).ask, 3)).resolves.toBe(false);
    await expect(askApplyChanges(fakeAsk(['n']).ask, 3)).resolves.toBe(false);
    await expect(askApplyChanges(fakeAsk(['sure!']).ask, 3)).resolves.toBe(
      false
    );
  });

  it('apply question names the file count and the [y/N] default', async () => {
    const { ask, questions } = fakeAsk(['y']);
    await askApplyChanges(ask, 4);
    expect(questions[0]).toContain('4');
    expect(questions[0]).toContain('[y/N]');
  });

  it('divergence maps a/i/c and cancels on anything else', async () => {
    await expect(askDivergenceAction(fakeAsk(['a']).ask)).resolves.toBe(
      'align'
    );
    await expect(askDivergenceAction(fakeAsk(['A']).ask)).resolves.toBe(
      'align'
    );
    await expect(askDivergenceAction(fakeAsk(['i']).ask)).resolves.toBe(
      'ignore'
    );
    await expect(askDivergenceAction(fakeAsk(['c']).ask)).resolves.toBe(
      'cancel'
    );
    // An empty answer waits on a human — the safe default is cancel.
    await expect(askDivergenceAction(fakeAsk(['']).ask)).resolves.toBe(
      'cancel'
    );
    await expect(askDivergenceAction(fakeAsk(['wat']).ask)).resolves.toBe(
      'cancel'
    );
  });
});

describe('--yes reporting', () => {
  it('prints pkg: old → new per aligned pin plus the install instruction', () => {
    const plan = computeInitPlan(baseInput(tmp, { align: true }));
    const lines: string[] = [];
    printAlignmentReport(plan, (line) => lines.push(line));

    expect(lines.some((line) => line.includes('react: ^9.8.7 → 9.9.9'))).toBe(
      true
    );
    expect(lines.join('\n')).toMatch(/run your package manager install/i);
  });

  it('prints nothing when there was nothing to align', () => {
    const plan = computeInitPlan(baseInput(tmp, { align: true }));
    const empty: InitPlan = { ...plan, alignment: [] };
    const lines: string[] = [];
    printAlignmentReport(empty, (line) => lines.push(line));
    expect(lines).toEqual([]);
  });
});

describe('formatPlanDiff', () => {
  it('names every planned file and the manual/advisory sections', () => {
    const plan = computeInitPlan(
      baseInput(tmp, {
        // Force a manual step: point the surgery at a non-existent config.
        hostConfigPath: path.join(tmp, 'apps', 'host', 'nope.rspack.config.js'),
        scannedAdvisories: ['lazy.tsx:3 — dynamic import()'],
      })
    );
    const rendered = formatPlanDiff(plan);

    expect(rendered).toContain('remotes/store/package.json');
    expect(rendered).toContain('Manual steps:');
    expect(rendered).toContain('Advisories:');
    expect(rendered).toContain('lazy.tsx:3 — dynamic import()');
    expect(rendered).toContain(
      'remote-drift: react: remote 9.8.7 vs host 9.9.9'
    );
  });
});
