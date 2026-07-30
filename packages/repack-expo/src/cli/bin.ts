#!/usr/bin/env node

import {
  type Diagnostic,
  parseExpoCommand,
  runDoctor,
  runInit,
} from './commands.js';

function writeDiagnostics(diagnostics: Diagnostic[]): void {
  for (const diagnostic of diagnostics) {
    const stream =
      diagnostic.severity === 'error' ? process.stderr : process.stdout;
    stream.write(`[${diagnostic.code}] ${diagnostic.message}\n`);
    if (diagnostic.recovery) {
      stream.write(`  Recovery: ${diagnostic.recovery}\n`);
    }
  }
}

try {
  const options = parseExpoCommand(process.argv.slice(2));
  if (options.command === 'init') {
    const result = runInit(options);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      writeDiagnostics(result.diagnostics);
      if (result.changedFiles.length === 0 && result.ok) {
        process.stdout.write('Re.Pack Expo setup is up to date.\n');
      } else if (result.changedFiles.length > 0) {
        const action = result.wrote ? 'Changed' : 'Would change';
        process.stdout.write(`${action}: ${result.changedFiles.join(', ')}\n`);
      }
      if (result.wrote) {
        process.stdout.write(
          `Next: ${result.installCommand}, then expo prebuild.\n`
        );
      }
    }
    if (!result.ok) process.exitCode = 1;
  } else {
    const result = runDoctor();
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      writeDiagnostics(result.diagnostics);
      if (result.ok) {
        process.stdout.write(
          result.warningCount > 0
            ? `Doctor passed with ${result.warningCount} warning(s).\n`
            : 'Doctor passed.\n'
        );
      } else {
        process.stderr.write(`Doctor found ${result.errorCount} error(s).\n`);
      }
    }
    if (!result.ok) process.exitCode = 1;
  }
} catch (cause) {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (process.argv.slice(2).includes('--json')) {
    process.stdout.write(
      `${JSON.stringify({
        diagnostics: [
          {
            code: 'CLI_ERROR',
            message,
            severity: 'error',
          },
        ],
        errorCount: 1,
        ok: false,
      })}\n`
    );
  } else {
    process.stderr.write(`${message}\n`);
  }
  process.exitCode = 1;
}
