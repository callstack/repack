import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { generateReleaseNotes, readRelease } from './release-notes.mjs';

const fixture = JSON.parse(
  await readFile(
    new URL('./fixtures/release-5.4.2.json', import.meta.url),
    'utf8'
  )
);

test('combines the actual 5.4.2 core and init notes into one release', () => {
  const release = generateReleaseNotes(fixture);
  assert.equal(release.name, '5.4.2');
  assert.equal(release.tag_name, '@callstack/repack@5.4.2');
  assert.equal(release.prerelease, false);
  assert.match(release.body, /Fix `\.jpeg` images/);
  assert.match(
    release.body,
    /Bootstrap new projects with React Native 0\.87\.1/
  );
  assert.equal((release.body.match(/^## @callstack\//gm) ?? []).length, 2);
  assert.equal((release.body.match(/^- `@callstack\//gm) ?? []).length, 6);
  assert.doesNotMatch(release.body, /5\.4\.1|#1479|#1476|consumer ProGuard/);
});

test('does not generate empty sections for version-aligned packages', () => {
  const release = generateReleaseNotes(fixture);
  assert.match(
    release.body,
    /- `@callstack\/repack-plugin-reanimated@5\.4\.2`/
  );
  assert.doesNotMatch(
    release.body,
    /^## @callstack\/repack-plugin-reanimated/m
  );
});

test('fails rather than publishing the entire changelog when a version is missing', () => {
  const packages = structuredClone(fixture);
  packages[0].changelog = '# Package\n\n## 5.4.20\n\nWrong release';
  assert.throws(
    () => generateReleaseNotes(packages),
    /repack: Missing changelog entry for 5\.4\.2/
  );
});

test('preserves fenced code and nested headings without reading an older version', () => {
  const packages = [
    {
      name: '@callstack/repack',
      version: '5.4.2',
      changelog: [
        '# Package',
        '```md',
        '## 5.4.2',
        'wrong',
        '```',
        '## 5.4.2',
        '### Patch Changes',
        'Notes',
        '````md',
        '## 5.0.0',
        '```',
        'more code',
        '````',
        '~~~md',
        '# Example',
        '~~~',
        '## 5.4.1',
        'Old notes',
      ].join('\r\n'),
    },
  ];
  const release = generateReleaseNotes(packages);
  assert.match(release.body, /### Patch Changes\nNotes/);
  assert.match(release.body, /## 5\.0\.0\n```\nmore code/);
  assert.match(release.body, /~~~md\n# Example\n~~~/);
  assert.doesNotMatch(release.body, /wrong|Old notes/);
});

test('rejects mixed versions instead of selecting a misleading common tag', () => {
  const packages = structuredClone(fixture);
  packages[1].version = '5.4.3';
  assert.throws(() => generateReleaseNotes(packages), /version mismatch/);
});

test('requires the main package for the canonical release tag', () => {
  assert.throws(
    () => generateReleaseNotes(fixture.slice(1)),
    /Missing @callstack\/repack/
  );
});

test('marks a Changesets prerelease correctly', () => {
  const release = generateReleaseNotes([
    {
      name: '@callstack/repack',
      version: '6.0.0-rc.0',
      changelog: '## 6.0.0-rc.0\n\nPreview',
    },
  ]);
  assert.equal(release.prerelease, true);
});

test('reads the configured release group from the repository', async () => {
  const { packages, release } = await readRelease(
    fileURLToPath(new URL('../../', import.meta.url))
  );
  assert.equal(packages[0].name, '@callstack/repack');
  assert.equal(release.tag_name, `@callstack/repack@${packages[0].version}`);
  assert.equal(packages.length, 6);
});
