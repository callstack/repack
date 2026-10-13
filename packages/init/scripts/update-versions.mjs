import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REGISTRY = 'https://registry.npmjs.org';

// Keep Rspack on 1.x until Re.Pack supports Rspack 2.
const DIST_TAGS = {
  '@rspack/core': 'latest-v1',
};

const versionsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../versions.json'
);

async function getVersion(name) {
  const tag = DIST_TAGS[name] ?? 'latest';
  const response = await fetch(`${REGISTRY}/-/package/${name}/dist-tags`);
  if (!response.ok) {
    throw new Error(`Failed to fetch dist-tags of ${name}: ${response.status}`);
  }

  const version = (await response.json())[tag];
  if (!version) {
    throw new Error(`Package ${name} has no "${tag}" dist-tag`);
  }

  return version;
}

const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));

versions['react-native'] = await getVersion('react-native');

for (const bundler of ['rspack', 'webpack']) {
  for (const name of Object.keys(versions[bundler])) {
    versions[bundler][name] = '^' + (await getVersion(name));
  }
}

fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\n');
console.log(JSON.stringify(versions, null, 2));
