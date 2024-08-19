const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { rmSync, mkdtempSync } = require('node:fs');

const repoUrl = 'https://github.com/facebook/metro.git';
const testsPath = 'packages/metro-resolver/src/__tests__';

const repoDir = mkdtempSync(path.join(os.tmpdir(), 'metro-'));
const targetDir = path.join(__dirname, 'resolver', '__tests__');

execSync(`git clone --no-checkout --depth 1 --sparse ${repoUrl} ${repoDir}`, {
  stdio: 'ignore',
});

process.chdir(repoDir);

execSync(`git sparse-checkout add ${testsPath}`, { stdio: 'ignore' });
execSync('git checkout', { stdio: 'ignore' });

const from = path.join(process.cwd(), testsPath) + path.sep;
const to = targetDir + path.sep;

console.log('🪄 Updating test files:');
execSync(`rsync -ai --out-format='%n' ${from} ${to} | grep -v '/$'`, {
  stdio: 'inherit',
});

process.chdir('..');
rmSync(repoDir, { recursive: true, force: true });
