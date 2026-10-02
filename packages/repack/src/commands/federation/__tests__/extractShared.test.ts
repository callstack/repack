import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ModuleFederationPluginV1 } from '../../../plugins/ModuleFederationPluginV1.js';
import { ModuleFederationPluginV2 } from '../../../plugins/ModuleFederationPluginV2.js';
import { ConfigEvalError, extractAppShared } from '../extractShared.js';

const WORKSPACE = path.join(
  __dirname,
  '..',
  '__fixtures__',
  'dry-run-workspace'
);
const appDir = (app: string) => path.join(WORKSPACE, 'apps', app);

describe('getSharedConfiguration accessor', () => {
  it('returns the constructor shared option verbatim on ModuleFederationPluginV1', () => {
    const shared = { react: { singleton: true, eager: true } };
    const plugin = new ModuleFederationPluginV1({ name: 'shell', shared });
    // Verbatim means the same object: no copy, no deep-import injection.
    expect(plugin.getSharedConfiguration()).toBe(shared);
    expect(Object.keys(plugin.getSharedConfiguration() as object)).toEqual([
      'react',
    ]);
  });

  it('returns the constructor shared option verbatim on ModuleFederationPluginV2', () => {
    const shared = { react: { singleton: true, eager: false } };
    const plugin = new ModuleFederationPluginV2({ name: 'shell', shared });
    expect(plugin.getSharedConfiguration()).toBe(shared);
  });
});

describe('extractAppShared', () => {
  it('evaluates a CJS stub config and resolves exact versions from the app root', async () => {
    const extracted = await extractAppShared(appDir('host'));

    expect(extracted.name).toBe('shell');
    expect(extracted.pluginName).toBe('ModuleFederationPluginV1');
    // The fixture's mini node_modules/react pins 9.9.9 and must win over any
    // react resolvable further up the tree (same proof as defineShared).
    expect(extracted.shared).toEqual([
      {
        name: 'react',
        version: '9.9.9',
        singleton: true,
        eager: true,
        requiredVersion: '9.9.9',
      },
    ]);
  });

  it('resolves per-app installed versions, not one global tree', async () => {
    const clean = await extractAppShared(appDir('remote-clean'));
    const drift = await extractAppShared(appDir('remote-drift'));

    expect(clean.shared).toEqual([
      expect.objectContaining({
        name: 'react',
        version: '9.9.9',
        eager: false,
      }),
    ]);
    expect(drift.shared).toEqual([
      expect.objectContaining({
        name: 'react',
        version: '9.8.7',
        eager: false,
      }),
    ]);
  });

  it('lets an explicit --config path win over discovered config files', async () => {
    const extracted = await extractAppShared(appDir('host'), {
      configPath: path.join(appDir('host'), 'alt-rspack.config.cjs'),
    });

    expect(extracted.name).toBe('override');
  });

  it('turns a config that throws on import into a ConfigEvalError without a stack', async () => {
    await expect(extractAppShared(appDir('broken'))).rejects.toThrow(
      ConfigEvalError
    );
    await expect(extractAppShared(appDir('broken'))).rejects.toThrow('kaboom');
    try {
      await extractAppShared(appDir('broken'));
    } catch (error) {
      expect((error as Error).message).not.toMatch(/\n\s+at\s/);
    }
  });

  it('rejects a config that instantiates no federation plugin', async () => {
    await expect(extractAppShared(appDir('nonplugin'))).rejects.toThrow(
      ConfigEvalError
    );
    try {
      await extractAppShared(appDir('nonplugin'));
    } catch (error) {
      expect((error as Error).message).toContain(
        path.join(appDir('nonplugin'), 'rspack.config.js')
      );
    }
  });

  it('discovers a single init-style rspack.<name> config when no conventional file exists', async () => {
    // federation-init generates `rspack.<remote>.mts` — not a conventional
    // name. dry-run extraction must still find it when it is the only
    // rspack-prefixed config in the app dir.
    const extracted = await extractAppShared(appDir('remote-generated'));

    expect(extracted.name).toBe('store');
    expect(extracted.shared).toEqual([
      expect.objectContaining({ name: 'react', eager: false }),
    ]);
  });

  it('refuses to guess between several init-style configs', async () => {
    await expect(extractAppShared(appDir('ambiguous'))).rejects.toThrow(
      ConfigEvalError
    );
  });

  it('rejects an app directory with no bundler configuration at all', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-nocfg-'));
    try {
      await expect(extractAppShared(emptyDir)).rejects.toThrow(ConfigEvalError);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
