import fs from 'node:fs';
import path from 'node:path';
import type { InitPlan } from './plan.js';

/**
 * Thin writer over a computed plan. Nothing here decides *whether* to write
 * — the diff-before-write gate lives in the command; this runs only after
 * confirmation (or `--yes`). Writes exactly `plan.files`, never anything
 * else, so the plan's before/after content is the complete story of what
 * lands on disk.
 */
export function applyPlan(
  plan: InitPlan,
  write: (filePath: string, content: string) => void = (filePath, content) =>
    fs.writeFileSync(filePath, content)
): void {
  for (const file of plan.files) {
    fs.mkdirSync(path.dirname(file.path), { recursive: true });
    write(file.path, file.after);
  }
}

/**
 * `--yes` auto-align report: names each rewritten pin old→new and tells the
 * user to run their package manager install — rewriting pins without
 * reinstalling is only half the alignment, and the report says so.
 */
export function printAlignmentReport(
  plan: InitPlan,
  log: (line: string) => void = (line) => console.log(line)
): void {
  if (plan.alignment.length === 0) return;
  log('Aligned shared dependency pins to the host:');
  for (const entry of plan.alignment) {
    log(`  ${entry.remote}: ${entry.pkg}: ${entry.from} → ${entry.to}`);
  }
  log(
    'Pins were rewritten but not installed — run your package manager install (e.g. `pnpm install`) before building.'
  );
}
