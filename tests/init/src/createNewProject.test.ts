import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const expectPath = '/usr/bin/expect';
const repoRootDir = path.resolve(import.meta.dirname, '../../..');
const initBinPath = path.join(repoRootDir, 'packages/init/dist/bin.js');
const tempDirs: string[] = [];

const projectPbxprojFixture = `// !$*UTF8*$!
{
  archiveVersion = 1;
  classes = {};
  objectVersion = 56;
  objects = {

/* Begin PBXShellScriptBuildPhase section */
    1234567890ABCDEF12345678 /* Bundle React Native code and images */ = {
      isa = PBXShellScriptBuildPhase;
      buildActionMask = 2147483647;
      files = (
      );
      inputPaths = (
      );
      name = "Bundle React Native code and images";
      outputPaths = (
      );
      runOnlyForDeploymentPostprocessing = 0;
      shellPath = /bin/sh;
      shellScript = "echo hi\\n";
      showEnvVarsInLog = 0;
    };
/* End PBXShellScriptBuildPhase section */
  };
  rootObject = 1234567890ABCDEF12345678;
}
`;

function createTempDir(prefix: string) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

function writeExecutable(filePath: string, content: string) {
  fs.writeFileSync(filePath, content);
  fs.chmodSync(filePath, 0o755);
}

function createFetchStub(tempDir: string) {
  const fetchStubPath = path.join(tempDir, 'fetch-stub.mjs');

  fs.writeFileSync(
    fetchStubPath,
    `globalThis.fetch = async () => ({
  text: async () => "export default {\\n  entry = 'index.js',\\n};\\n",
});
`
  );

  return fetchStubPath;
}

function createFakeNpm(binDir: string, argsFile: string) {
  const fakeNpmPath = path.join(binDir, 'npm');

  writeExecutable(
    fakeNpmPath,
    `#!/bin/sh
printf '%s\n' "$@" > "${argsFile}"
directory=""
previous=""

for arg in "$@"; do
  if [ "$previous" = "--directory" ]; then
    directory="$arg"
  fi
  previous="$arg"
done

if [ -n "$directory" ]; then
  mkdir -p "$directory/ios/RepackApp.xcodeproj"
  cat > "$directory/package.json" <<'EOF'
{
  "name": "RepackApp",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "react-native": "0.81.0"
  }
}
EOF
  cat > "$directory/ios/RepackApp.xcodeproj/project.pbxproj" <<'EOF'
${projectPbxprojFixture}
EOF
fi

exit 0
`
  );
}

function createFakeGit(binDir: string) {
  const fakeGitPath = path.join(binDir, 'git');

  writeExecutable(
    fakeGitPath,
    `#!/bin/sh
exit 1
`
  );
}

function runBuiltInitWithFakeNpm() {
  const tempDir = createTempDir('repack-init-test-');
  const fakeBinDir = createTempDir('repack-init-bin-');
  const argsFile = path.join(fakeBinDir, 'npm-args.txt');
  const fetchStubPath = createFetchStub(tempDir);

  createFakeNpm(fakeBinDir, argsFile);
  createFakeGit(fakeBinDir);

  const result = spawnSync(
    expectPath,
    [
      '-c',
      `set timeout 30
spawn node ${initBinPath} --bundler rspack --verbose
expect {Detected npm as package manager running the script}
after 1000
send "\\r"
expect eof
catch wait result
set exit_code [lindex $result 3]
exit $exit_code
`,
    ],
    {
      cwd: tempDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${fakeBinDir}:${process.env.PATH ?? ''}`,
        PWD: tempDir,
        npm_config_user_agent: 'npm/10.9.0 node/v22.0.0 darwin x64',
        NODE_OPTIONS: `--import=${fetchStubPath}`,
        FORCE_COLOR: '0',
      },
    }
  );

  const debugOutput = [result.stdout, result.stderr].filter(Boolean).join('\n');

  expect(result.status, debugOutput).toBe(0);
  expect(fs.existsSync(argsFile)).toBe(true);

  return {
    args: fs.readFileSync(argsFile, 'utf8').trim().split('\n'),
    projectRootDir: path.join(tempDir, 'RepackApp'),
  };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('built repack-init CLI', () => {
  it('uses npm exec with rnc-cli and a fully-qualified react-native version', () => {
    const { args, projectRootDir } = runBuiltInitWithFakeNpm();
    const versionFlagIndex = args.indexOf('--version');

    expect(args.slice(0, 6)).toEqual([
      'exec',
      '--yes',
      '--package',
      '@react-native-community/cli@latest',
      '--',
      'rnc-cli',
    ]);
    expect(versionFlagIndex).not.toBe(-1);
    expect(args[versionFlagIndex + 1]).toMatch(/^\d+\.\d+\.\d+(?:-.+)?$/);
    expect(fs.existsSync(path.join(projectRootDir, 'rspack.config.mjs'))).toBe(
      true
    );
    expect(
      fs.existsSync(path.join(projectRootDir, 'react-native.config.js'))
    ).toBe(true);
  });
});
