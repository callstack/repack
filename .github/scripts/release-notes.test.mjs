import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { generateReleaseNotes } from './release-notes.mjs';

const fixture = JSON.parse(
  await readFile(
    new URL('./fixtures/release-5.4.2.json', import.meta.url),
    'utf8'
  )
);

test('merges the actual 5.4.2 notes without dependency updates or empty sections', () => {
  const notes = generateReleaseNotes(fixture);
  assert.match(notes, /Fix `\.jpeg` images/);
  assert.match(notes, /Bootstrap new projects with React Native 0\.87\.1/);
  assert.match(notes, /\n\n {2}If you have a `\.jpeg`/);
  assert.equal((notes.match(/^## Patch Changes$/gm) ?? []).length, 1);
  for (const pkg of fixture) {
    assert.ok(notes.includes(`- \`${pkg.name}@${pkg.version}\``));
  }
  assert.doesNotMatch(
    notes,
    /Updated dependencies|^## @callstack\/|5\.4\.1|#1479|#1476|consumer ProGuard/m
  );
});

test('includes the shared 5.4.1 changeset only once across packages', () => {
  const notes = generateReleaseNotes(
    fixture.map((pkg) => ({ ...pkg, version: '5.4.1' }))
  );
  assert.equal((notes.match(/\[#1476\]/g) ?? []).length, 1);
  assert.equal((notes.match(/^## Patch Changes$/gm) ?? []).length, 1);
  assert.match(notes, /consumer ProGuard/);
  assert.match(notes, /XML font-family resources continue to use `res\/font`/);
  assert.doesNotMatch(notes, /Updated dependencies|#1480|#1482|5\.4\.2/);
});

test('groups changes by type and preserves multiline notes including fenced headings', () => {
  const example =
    '- Example\n\n  ```md\n  ## 0.1.0\n  ### Patch Changes\n  - Nested item\n  ```';
  const notes = generateReleaseNotes([
    {
      name: '@callstack/repack',
      version: '6.0.0',
      changelog: `## 6.0.0\n\n### Patch Changes\n\n${example}\n\n### Major Changes\n\n- Breaking change\n\n## 5.4.2\n\nOld notes`,
    },
    {
      name: '@callstack/repack-init',
      version: '6.0.0',
      changelog:
        '## 6.0.0\n\n### Minor Changes\n\n- New option\n\n### Patch Changes\n\n- Another fix',
    },
  ]);
  assert.ok(notes.includes(example));
  assert.ok(
    notes.indexOf('## Major Changes') < notes.indexOf('## Minor Changes')
  );
  assert.ok(
    notes.indexOf('## Minor Changes') < notes.indexOf('## Patch Changes')
  );
  assert.match(notes, /- Another fix/);
  assert.doesNotMatch(notes, /Old notes/);
});

test('fails instead of including another version when the requested entry is missing', () => {
  const packages = structuredClone(fixture);
  packages[0].changelog = '# Package\n\n## 5.4.20\n\nWrong release';
  assert.throws(
    () => generateReleaseNotes(packages),
    /repack: Missing changelog entry for 5\.4\.2/
  );
});
