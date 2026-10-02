import path from 'node:path';
import {
  type DefineSharedDeps,
  defineShared,
  SharedDependencyUnresolvedError,
} from '../defineShared.js';

const APP = path.join(__dirname, '__fixtures__', 'define-shared-app');
const SPLIT_APP = path.join(
  __dirname,
  '__fixtures__',
  'define-shared-split-app'
);

describe('defineShared', () => {
  describe('exact pins from installed packages', () => {
    it('pins version and requiredVersion to the installed package version', () => {
      const shared = defineShared({ react: 'auto' }, { context: APP });

      expect(shared.react).toMatchObject({
        version: '9.9.9',
        requiredVersion: '9.9.9',
      });
    });

    it('resolves the copy visible from each provided context', () => {
      const appShared = defineShared(['react'], { context: APP });
      const splitShared = defineShared(['react'], { context: SPLIT_APP });

      expect(appShared.react!.version).toBe('9.9.9');
      expect(splitShared.react!.version).toBe('8.8.8');
    });

    it('defaults the context to the process working directory', () => {
      const cwdSpy = jest
        .spyOn(process, 'cwd')
        .mockReturnValue(path.join(APP, 'src'));

      try {
        // No explicit context: resolution must start from cwd (a subdirectory
        // of the fixture app, so `react` resolves through its node_modules).
        const shared = defineShared(['react']);
        expect(shared.react!.version).toBe('9.9.9');
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('overwrites any user-provided version and requiredVersion', () => {
      const shared = defineShared(
        { react: { version: '1.2.3', requiredVersion: '^1.0.0' } },
        { context: APP }
      );

      expect(shared.react).toMatchObject({
        version: '9.9.9',
        requiredVersion: '9.9.9',
      });
    });

    it('fails loud naming the package, the context and the fix', () => {
      let caught: unknown;
      try {
        defineShared(['@fixture/not-installed'], { context: APP });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(SharedDependencyUnresolvedError);
      const error = caught as SharedDependencyUnresolvedError;
      expect(error.name).toBe('SharedDependencyUnresolvedError');
      // Frozen text (design D2): names the package and the abs context,
      // explains why an exact pin is required, and how to fix it. Never
      // substitutes a placeholder, range or `unknown`.
      expect(error.message).toBe(
        'defineShared: cannot resolve an installed version for "@fixture/not-installed" from context ' +
          `"${APP}".\n` +
          'Shared dependencies must be pinned to one exact installed version so host and remotes agree — ' +
          'an unresolvable package cannot be pinned, and no placeholder or range is substituted.\n' +
          `Fix: install "@fixture/not-installed" in the app resolved from "${APP}", ` +
          'or remove it from the shared dependency list.'
      );
    });
  });

  describe('identical pins from one dependency tree', () => {
    it('emits byte-identical maps for two contexts resolving the same copy', () => {
      const hostSide = defineShared(['react', 'react-native'], {
        context: APP,
        role: 'remote',
      });
      const remoteSide = defineShared(['react', 'react-native'], {
        // A different directory inside the same tree: the same installed
        // copies resolve, so the emitted pins must be byte-identical.
        context: path.join(APP, 'src', 'features'),
        role: 'remote',
      });

      expect(JSON.stringify(hostSide)).toBe(JSON.stringify(remoteSide));
    });
  });

  describe('role and mode eager convention', () => {
    it('emits eager: true for every entry with the default host role', () => {
      const shared = defineShared(['react', 'react-native'], {
        context: APP,
      });

      expect(shared.react!.eager).toBe(true);
      expect(shared['react-native']!.eager).toBe(true);
    });

    it('emits eager: false for every entry with role remote', () => {
      const shared = defineShared(['react', 'react-native'], {
        context: APP,
        role: 'remote',
      });

      expect(shared.react!.eager).toBe(false);
      expect(shared['react-native']!.eager).toBe(false);
    });

    it('emits eager: true for every entry in standalone mode regardless of role', () => {
      const shared = defineShared(['react', 'react-native'], {
        context: APP,
        role: 'remote',
        mode: 'standalone',
      });

      expect(shared.react!.eager).toBe(true);
      expect(shared['react-native']!.eager).toBe(true);
    });

    it('lets an explicit eager value win over the convention', () => {
      const shared = defineShared(['react', 'react-native'], {
        context: APP,
        role: 'remote',
        mode: 'standalone',
      });
      const eagerRemote = defineShared(
        { react: { eager: true } },
        { context: APP, role: 'remote' }
      );

      // Both calls override the convention in opposite directions.
      const explicitLazy = defineShared(
        { react: { eager: false } },
        { context: APP, mode: 'standalone' }
      );

      expect(explicitLazy.react!.eager).toBe(false);
      expect(eagerRemote.react!.eager).toBe(true);
      // sanity: without overrides the convention still applies
      expect(shared.react!.eager).toBe(true);
      expect(shared['react-native']!.eager).toBe(true);
    });
  });

  describe('singleton and passthrough config', () => {
    it('defaults singleton to true and honors the user override', () => {
      const shared = defineShared(
        { react: {}, 'react-native': { singleton: false } },
        { context: APP }
      );

      expect(shared.react!.singleton).toBe(true);
      expect(shared['react-native']!.singleton).toBe(false);
    });

    it('passes through remaining config keys verbatim', () => {
      const shared = defineShared(
        {
          react: {
            import: false,
            shareScope: 'custom',
            strictVersion: true,
          },
        },
        { context: APP }
      );

      expect(shared.react).toMatchObject({
        import: false,
        shareScope: 'custom',
        strictVersion: true,
      });
    });
  });

  describe('accepted dependency shapes (normalizeSharedEntries)', () => {
    it('accepts a single string', () => {
      const shared = defineShared('react', { context: APP });
      expect(Object.keys(shared)).toEqual(['react']);
    });

    it('accepts an array of strings', () => {
      const shared = defineShared(['react', '@scoped/shared-util'], {
        context: APP,
      });
      expect(Object.keys(shared)).toEqual(['react', '@scoped/shared-util']);
      expect(shared['@scoped/shared-util']!.version).toBe('1.2.3');
    });

    it('accepts a record of name to config', () => {
      const shared = defineShared(
        { react: 'auto', 'react-native': { eager: false } },
        { context: APP }
      );
      expect(Object.keys(shared)).toEqual(['react', 'react-native']);
      expect(shared['react-native']!.eager).toBe(false);
    });

    it('accepts a mixed array of wrappers and name items', () => {
      const deps: DefineSharedDeps = [
        'react',
        { 'react-native': { eager: false } },
        { name: '@scoped/shared-util', singleton: false },
      ];
      const shared = defineShared(deps, { context: APP });

      expect(Object.keys(shared)).toEqual([
        'react',
        'react-native',
        '@scoped/shared-util',
      ]);
      expect(shared['@scoped/shared-util']!.singleton).toBe(false);
    });
  });

  describe('deep-import keys', () => {
    it('emits a user-declared trailing-slash key verbatim, never version-resolved', () => {
      const shared = defineShared(
        { 'react-native/': { eager: true } },
        { context: APP }
      );

      expect(shared['react-native/']).toEqual({ eager: true });
    });

    it('never injects synthetic deep-import keys', () => {
      const shared = defineShared(['react', 'react-native'], {
        context: APP,
      });

      expect(Object.keys(shared)).not.toContain('react-native/');
      expect(Object.keys(shared)).not.toContain('@react-native/');
    });
  });
});
