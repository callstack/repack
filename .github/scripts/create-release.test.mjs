import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { publishRelease } from './create-release.mjs';
import { generateReleaseNotes } from './release-notes.mjs';

const packages = JSON.parse(
  await readFile(
    new URL('./fixtures/release-5.4.2.json', import.meta.url),
    'utf8'
  )
);
const release = generateReleaseNotes(packages);
const sha = 'a'.repeat(40);

function mockGitHub({
  missingTag,
  wrongTag,
  existing = false,
  failCreateOnce = false,
  denied = false,
} = {}) {
  const calls = [];
  let exists = existing;
  let failed = false;
  return {
    calls,
    request: async (url, options) => {
      const endpoint = decodeURIComponent(
        url.split('/repos/callstack/repack/')[1]
      );
      calls.push({ endpoint, ...options });
      let status = 200;
      let body;
      if (denied) {
        status = 403;
      } else if (endpoint.startsWith('commits/')) {
        const tag = endpoint.slice('commits/'.length);
        status = tag === missingTag ? 404 : 200;
        body = { sha: tag === wrongTag ? 'b'.repeat(40) : sha };
      } else if (endpoint.startsWith('releases/tags/')) {
        status = exists ? 200 : 404;
        body = {
          html_url: 'https://github.com/callstack/repack/releases/tag/existing',
        };
      } else if (endpoint === 'releases' && options.method === 'POST') {
        if (failCreateOnce && !failed) {
          status = 500;
          failed = true;
        } else {
          status = 201;
          exists = true;
          body = {
            html_url:
              'https://github.com/callstack/repack/releases/tag/created',
          };
        }
      } else {
        assert.fail(`Unexpected GitHub request: ${options.method} ${endpoint}`);
      }
      return new Response(JSON.stringify(body ?? {}), { status });
    },
  };
}

function publish(github, overrides = {}) {
  return publishRelease({
    release,
    packages,
    repository: 'callstack/repack',
    sha,
    token: 'test-token',
    request: github.request,
    ...overrides,
  });
}

test('six published packages produce exactly one release on the existing main tag', async () => {
  const github = mockGitHub();
  await publish(github, { publishedPackages: packages });
  const posts = github.calls.filter((call) => call.method === 'POST');
  assert.equal(posts.length, 1);
  assert.equal(
    github.calls.filter((call) => call.endpoint.startsWith('commits/')).length,
    6
  );
  assert.deepEqual(JSON.parse(posts[0].body), release);
  assert.equal(posts[0].headers.Authorization, 'Bearer test-token');
});

test('an existing release is preserved without an update or duplicate', async () => {
  const github = mockGitHub({ existing: true });
  assert.match(await publish(github), /already exists/);
  assert.equal(github.calls.filter((call) => call.method !== 'GET').length, 0);
});

test('retry after GitHub failure works without new npm publications and keeps all notes', async () => {
  const github = mockGitHub({ failCreateOnce: true });
  await assert.rejects(
    publish(github, { publishedPackages: packages }),
    /failed \(500\)/
  );
  assert.match(
    await publish(github, { publishedPackages: [] }),
    /Created release/
  );
  assert.match(await publish(github), /already exists/);
  const posts = github.calls.filter((call) => call.method === 'POST');
  assert.equal(posts.length, 2);
  assert.deepEqual(JSON.parse(posts[1].body), release);
});

test('a partial publish report still uses notes from the complete fixed group', async () => {
  const github = mockGitHub();
  await publish(github, { publishedPackages: [packages[1]] });
  const posted = JSON.parse(
    github.calls.find((call) => call.method === 'POST').body
  );
  assert.match(posted.body, /Bootstrap new projects/);
  assert.match(posted.body, /Fix `\.jpeg` images/);
});

test('a normal push without release tags does not create a release', async () => {
  const github = mockGitHub({ wrongTag: release.tag_name });
  assert.match(await publish(github), /skipping/);
  assert.equal(github.calls.length, 1);
});

test('a reported publication without its main tag fails visibly', async () => {
  const github = mockGitHub({ missingTag: release.tag_name });
  await assert.rejects(
    publish(github, { publishedPackages: packages }),
    /main package tag/
  );
});

for (const option of ['missingTag', 'wrongTag']) {
  test(`${option} prevents advertising an incomplete or mixed-commit release`, async () => {
    const github = mockGitHub({ [option]: `${packages[1].name}@5.4.2` });
    await assert.rejects(
      publish(github),
      /Package tag is missing or points to another commit/
    );
    assert.equal(
      github.calls.filter((call) => call.method === 'POST').length,
      0
    );
  });
}

test('permission errors are not treated as a missing release', async () => {
  const github = mockGitHub({ denied: true });
  await assert.rejects(publish(github), /failed \(403\)/);
});

test('independently versioned packages require an explicit release policy', async () => {
  const github = mockGitHub();
  await assert.rejects(
    publish(github, {
      publishedPackages: [{ name: '@callstack/repack-expo', version: '0.0.2' }],
    }),
    /outside the fixed release group/
  );
  assert.equal(github.calls.length, 0);
});
