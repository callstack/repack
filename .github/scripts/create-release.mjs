// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: This script runs directly in GitHub Actions outside Turborepo.
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readRelease } from './release-notes.mjs';

export async function publishRelease({
  release,
  packages,
  repository,
  sha,
  token,
  publishedPackages = [],
  request = fetch,
}) {
  if (!repository || !sha || !token) {
    throw new Error('GITHUB_REPOSITORY, GITHUB_SHA and GH_TOKEN are required');
  }

  for (const published of publishedPackages) {
    if (
      !packages.some(
        (pkg) =>
          pkg.name === published.name && pkg.version === published.version
      )
    ) {
      throw new Error(
        `Published package is outside the fixed release group: ${published.name}@${published.version}`
      );
    }
  }

  async function api(endpoint, body) {
    const method = body ? 'POST' : 'GET';
    const response = await request(
      `https://api.github.com/repos/${repository}/${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (response.status === 404 && method === 'GET') return null;
    if (!response.ok) {
      throw new Error(
        `GitHub ${method} ${endpoint} failed (${response.status})`
      );
    }
    return response.json();
  }

  // The commits endpoint resolves both lightweight and annotated package tags.
  const mainCommit = await api(
    `commits/${encodeURIComponent(release.tag_name)}`
  );
  if (mainCommit?.sha !== sha) {
    if (publishedPackages.length) {
      throw new Error(
        'The main package tag does not point to this release commit. Verify package publication and release tags before retrying.'
      );
    }
    return 'No release tags for this commit; skipping';
  }

  const existing = await api(
    `releases/tags/${encodeURIComponent(release.tag_name)}`
  );
  if (existing) return `Release already exists: ${existing.html_url}`;

  // On retries published-packages can be empty or partial. Check the whole
  // fixed group so the release never advertises an incomplete publication.
  for (const pkg of packages) {
    const tag = `${pkg.name}@${pkg.version}`;
    if (tag === release.tag_name) continue;
    const commit = await api(`commits/${encodeURIComponent(tag)}`);
    if (commit?.sha !== sha) {
      throw new Error(
        `Package tag is missing or points to another commit: ${tag}. Verify package publication and release tags before retrying.`
      );
    }
  }

  const created = await api('releases', release);
  return `Created release: ${created.html_url}`;
}

async function main() {
  const data = await readRelease(
    fileURLToPath(new URL('../../', import.meta.url))
  );
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify(data.release, null, 2));
    return;
  }
  console.log(
    await publishRelease({
      ...data,
      repository: process.env.GITHUB_REPOSITORY,
      sha: process.env.GITHUB_SHA,
      token: process.env.GH_TOKEN,
      publishedPackages: JSON.parse(process.env.PUBLISHED_PACKAGES || '[]'),
    })
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
