import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

  const changes = { Major: new Set(), Minor: new Set(), Patch: new Set() };
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
    const sections = entry.split(/^### (Major|Minor|Patch) Changes\s*$/m);
    for (let index = 1; index < sections.length; index += 2) {
      for (const item of sections[index + 1].split(/(?=^- )/m)) {
        const note = item.trim();
        if (note && !note.startsWith('- Updated dependencies')) {
          changes[sections[index]].add(note);
        }
      }
    }
  }

  return [
    '## Packages',
    packages.map((pkg) => `- \`${pkg.name}@${pkg.version}\``).join('\n'),
    ...Object.entries(changes)
      .filter(([, notes]) => notes.size)
      .map(
        ([type, notes]) => `## ${type} Changes\n\n${[...notes].join('\n\n')}`
      ),
  ].join('\n\n');
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
  return generateReleaseNotes(packages);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    console.log(
      await readRelease(fileURLToPath(new URL('../../', import.meta.url)))
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
