import type { CliOptions } from './types.js';

export { runDoctor } from './doctor.js';
export { runInit } from './init.js';
export { detectPackageManager } from './project.js';
export type {
  CliOptions,
  Diagnostic,
  DiagnosticSeverity,
  DoctorOptions,
  DoctorResult,
  FileChange,
  InitOptions,
  InitResult,
} from './types.js';

export const EXPO_COMMANDS = ['init', 'doctor'] as const;

export type ExpoCommand = (typeof EXPO_COMMANDS)[number];

export type ParsedExpoCommand = CliOptions & {
  command: ExpoCommand;
};

const USAGE = `Usage: repack-expo <${EXPO_COMMANDS.join('|')}> [--check] [--dry-run] [--json] [--force]`;

export function parseExpoCommand(argv: string[]): ParsedExpoCommand {
  const [candidate, ...args] = argv;
  if (!EXPO_COMMANDS.includes(candidate as ExpoCommand)) {
    throw new Error(USAGE);
  }
  const allowed = new Set(['--check', '--dry-run', '--json', '--force']);
  const unknown = args.find((argument) => !allowed.has(argument));
  if (unknown || (candidate === 'doctor' && args.includes('--force'))) {
    throw new Error(USAGE);
  }
  return {
    check: args.includes('--check'),
    command: candidate as ExpoCommand,
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    json: args.includes('--json'),
  };
}
