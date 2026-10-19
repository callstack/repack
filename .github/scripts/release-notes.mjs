import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const mainPackage = '@callstack/repack';

function changelogEntry(changelog, version) {
  const content = [];
  let found = false;
  let fence;

  for (const line of changelog.split(/\r?\n/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) {
        fence = undefined;
      }
    } else if (marker) {
      fence = marker;
    } else {
      const heading = /^ {0,3}(#{1,2})\s+(.+?)\s*#*\s*$/.exec(line);
      if (heading) {
        if (found) break;
        found = heading[1] === '##' && heading[2] === version;
        continue;
      }
    }
    if (found) content.push(line);
  }

  if (!found) throw new Error(`Missing changelog entry for ${version}`);
  return content.join('\n').trim();
}

export function generateReleaseNotes(packages) {
  const main = packages.find((pkg) => pkg.name === mainPackage);
  if (!main) throw new Error(`Missing ${mainPackage} in the release group`);

  const sections = [];
  for (const pkg of packages) {
    if (pkg.version !== main.version) {
      throw new Error(
        `Release group version mismatch: ${pkg.name}@${pkg.version}`
      );
    }
    let entry;
    try {
      entry = changelogEntry(pkg.changelog, pkg.version);
    } catch (error) {
      throw new Error(`${pkg.name}: ${error.message}`, { cause: error });
    }
    if (entry) sections.push(`## ${pkg.name}@${pkg.version}\n\n${entry}`);
  }

  return {
    name: main.version,
    tag_name: `${main.name}@${main.version}`,
    prerelease: main.version.includes('-'),
    body: [
      '## Packages',
      packages.map((pkg) => `- \`${pkg.name}@${pkg.version}\``).join('\n'),
      ...sections,
    ].join('\n\n'),
  };
}

export async function readRelease(root) {
  const config = JSON.parse(
    await readFile(path.join(root, '.changeset/config.json'), 'utf8')
  );
  const group = config.fixed.find((names) => names.includes(mainPackage));
  if (!group) throw new Error(`Missing fixed release group for ${mainPackage}`);

  const manifests = await Promise.all(
    (await readdir(path.join(root, 'packages'))).map(async (directory) => {
      const dir = path.join(root, 'packages', directory);
      const manifest = JSON.parse(
        await readFile(path.join(dir, 'package.json'), 'utf8')
      );
      return { dir, ...manifest };
    })
  );
  const packages = await Promise.all(
    group.map(async (name) => {
      const pkg = manifests.find((manifest) => manifest.name === name);
      if (!pkg || pkg.private || config.ignore.includes(name)) {
        throw new Error(
          `Release group package is missing or excluded: ${name}`
        );
      }
      return {
        name,
        version: pkg.version,
        changelog: await readFile(path.join(pkg.dir, 'CHANGELOG.md'), 'utf8'),
      };
    })
  );
  return { packages, release: generateReleaseNotes(packages) };
}
