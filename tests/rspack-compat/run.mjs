// Drives the dual-major smoke fixtures: builds @callstack/repack, packs it
// into a tarball, installs that tarball into each standalone fixture and
// runs smoke.cjs against the result.
//
// Usage: node run.mjs [fixture...]   (default: all fixtures)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const suiteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(suiteDir, '../..');
const repackDir = path.join(repoRoot, 'packages/repack');
const packDir = path.join(suiteDir, '.pack');

const allFixtures = ['rspack-1', 'rspack-2'];
const requested = process.argv.slice(2);
const fixtures = requested.length > 0 ? requested : allFixtures;

for (const fixture of fixtures) {
  if (!allFixtures.includes(fixture)) {
    console.error(
      `Unknown fixture '${fixture}' - expected one of: ${allFixtures.join(', ')}`
    );
    process.exit(1);
  }
}

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

// The lane guard in smoke.cjs verifies the *installed* major against the
// fixture's declared intent - derive that intent from the fixture manifest
// so the two can never drift apart silently.
function expectedMajorOf(fixtureDir) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(fixtureDir, 'package.json'), 'utf8')
  );
  const range = manifest.devDependencies['@rspack/core'];
  const major = Number.parseInt(range.replace(/^\D*/, ''), 10);
  if (!Number.isInteger(major)) {
    throw new Error(
      `Cannot derive the expected @rspack/core major from range '${range}'`
    );
  }
  return major;
}

// 1. Build and pack repack. The suite exists to test the *built dist* - the
// failure modes it covers (require(esm) interop, loader resolution, refresh
// runtime source selection) don't reproduce through the Jest/Babel pipeline,
// so it must never run against stale sources. Built through turbo so that
// workspace dependencies (repack-dev-server) are built first.
run('pnpm', ['turbo', 'run', 'build', '--filter', '@callstack/repack'], {
  cwd: repoRoot,
});
fs.rmSync(packDir, { recursive: true, force: true });
fs.mkdirSync(packDir, { recursive: true });
run('pnpm', ['pack', '--pack-destination', packDir], { cwd: repackDir });

const tarball = fs.readdirSync(packDir).find((file) => file.endsWith('.tgz'));
if (!tarball) {
  throw new Error('pnpm pack produced no tarball');
}

// 2. Install the tarball into each fixture and run the assertions.
const failed = [];

for (const fixture of fixtures) {
  const fixtureDir = path.join(suiteDir, 'fixtures', fixture);
  console.log(`\n=== fixture: ${fixture} ===`);

  fs.copyFileSync(
    path.join(packDir, tarball),
    path.join(fixtureDir, 'callstack-repack.tgz')
  );

  try {
    run('pnpm', ['install', '--no-frozen-lockfile'], { cwd: fixtureDir });
    run('node', [path.join(suiteDir, 'smoke.cjs')], {
      cwd: fixtureDir,
      env: {
        ...process.env,
        RSPACK_COMPAT_EXPECTED_MAJOR: String(expectedMajorOf(fixtureDir)),
      },
    });
    console.log(`=== fixture ${fixture}: PASS ===`);
  } catch {
    failed.push(fixture);
    console.error(`=== fixture ${fixture}: FAIL ===`);
  }
}

if (failed.length > 0) {
  console.error(`\nSmoke suite failed for: ${failed.join(', ')}`);
  process.exit(1);
}

console.log(`\nSmoke suite passed for: ${fixtures.join(', ')}`);
