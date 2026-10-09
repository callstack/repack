import path from 'node:path';
import { scanFeatureFolder } from '../scanFeatures.js';

const FEATURES = path.join(__dirname, '..', '__fixtures__', 'features-store');

describe('scanFeatureFolder', () => {
  const result = scanFeatureFolder(FEATURES);

  it('collects static imports, bare imports, exports-from and requires', () => {
    expect(result.dependencies).toEqual([
      '@shopify/flash-list',
      '@utils/collection',
      'legacy-bridge',
      'lodash',
      // clean/static.js — proves nested folders are walked
      'moment',
      'react',
      'react-native',
      'real-lib',
      'zone.js',
    ]);
  });

  it('maps subpath specifiers to their package root', () => {
    // deep.js declares lodash/merge, @utils/collection/map, zone.js/dist/*
    expect(result.dependencies).toContain('lodash');
    expect(result.dependencies).toContain('@utils/collection');
    expect(result.dependencies).toContain('zone.js');
    expect(result.dependencies).not.toContain('lodash/merge');
  });

  it('ignores react/jsx-runtime noise instead of listing it as a package', () => {
    expect(result.dependencies).not.toContain('react/jsx-runtime');
    expect(result.dependencies).not.toContain('react/jsx-dev-runtime');
  });

  it('never yields dependencies from comments', () => {
    for (const fake of [
      'commented-line-pkg',
      'block-comment-pkg',
      'block-require-pkg',
    ]) {
      expect(result.dependencies).not.toContain(fake);
    }
  });

  it('never yields dependencies from string or template literal content', () => {
    for (const fake of [
      'sneaky-quoted-pkg',
      'template-fake-pkg',
      'template-require-fake-pkg',
      'escaped-quoted-pkg',
    ]) {
      expect(result.dependencies).not.toContain(fake);
    }
  });

  it('filters relative and alias imports', () => {
    expect(result.dependencies).not.toContain('.');
    expect(result.dependencies).not.toContain('./helper');
    expect(result.dependencies).not.toContain('../data.json');
    expect(result.dependencies).not.toContain('@/config');
  });

  it('skips __tests__/ directories and *.test.* files', () => {
    expect(result.dependencies).not.toContain('test-only-pkg');
  });

  it('scans only supported source extensions', () => {
    // notes.md contains an import-looking line — .md is never scanned.
    expect(result.dependencies).not.toContain('md-pkg');
  });

  it('advises on every dynamic pattern, naming file and line, never silently passing', () => {
    // dynamic.ts lines: 4 import(, 8 computed require, 12 template require,
    // 16 literal import() — exactly four advisories, one per pattern.
    expect(result.advisories).toHaveLength(4);
    const joined = result.advisories.join('\n');
    expect(joined).toContain('dynamic.ts:4');
    expect(joined).toContain('dynamic.ts:8');
    expect(joined).toContain('dynamic.ts:12');
    expect(joined).toContain('dynamic.ts:16');
    for (const advisory of result.advisories) {
      expect(advisory).toContain('may be missing');
    }
  });

  it('does not claim dynamic-import dependencies were found', () => {
    // The only static-ish package behind a dynamic pattern in the fixture:
    expect(result.dependencies).not.toContain('some-async-pkg');
  });

  it('reports zero advisories for a folder with no dynamic patterns', () => {
    const clean = scanFeatureFolder(path.join(FEATURES, 'clean'));

    // Why empty here: clean/static.js has one static import and no dynamic
    // pattern — the deps side proves the folder was really scanned.
    expect(clean.dependencies).toEqual(['moment']);
    expect(clean.advisories).toEqual([]);
  });
});
