#!/usr/bin/env node
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const testerAppRoot = path.resolve(__dirname, '..');
const privateKeyPath = path.join(testerAppRoot, 'code-signing.pem');
const publicKeyPath = path.join(testerAppRoot, 'code-signing.pem.pub');

try {
  fs.rmSync(privateKeyPath, { force: true });
} catch {}
try {
  fs.rmSync(publicKeyPath, { force: true });
} catch {}

const opts = { stdio: 'inherit', cwd: testerAppRoot };
execSync(
  `ssh-keygen -t rsa -b 4096 -m PEM -f "${privateKeyPath}" -q -N ""`,
  opts
);
execSync(
  `openssl rsa -in "${privateKeyPath}" -pubout -outform PEM -out "${publicKeyPath}"`,
  opts
);
