import type { PlannedApp } from './devPlan.js';
import type { AppStatus } from './supervisor.js';

/** Fixed-width ASCII column render: same input ⇒ byte-identical rows. */
function renderTable(
  title: string,
  headers: string[],
  rows: string[][]
): string[] {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => row[column]!.length))
  );
  const line = (cells: string[]) =>
    cells
      .slice(0, -1)
      .map((cell, column) => cell.padEnd(widths[column]! + 2))
      .join('') + cells[cells.length - 1]!;
  return [title, line(headers), ...rows.map(line)];
}

const portCell = (app: PlannedApp) =>
  app.port === undefined ? 'auto' : String(app.port);
const configCell = (app: PlannedApp) => app.config ?? '-';

/** PLAN table: app / resolved config / port / URL — host first, file order. */
export function renderPlanTable(plan: PlannedApp[]): string[] {
  return renderTable(
    'PLAN',
    ['app', 'config', 'port', 'url'],
    plan.map((app) => [app.name, configCell(app), portCell(app), app.url])
  );
}

/** STATUS table: app / port / URL / health — same order as the plan. */
export function renderStatusTable(
  plan: PlannedApp[],
  statuses: Record<string, AppStatus>
): string[] {
  return renderTable(
    'STATUS',
    ['app', 'port', 'url', 'health'],
    plan.map((app) => [
      app.name,
      portCell(app),
      app.url,
      statuses[app.name] ?? 'starting',
    ])
  );
}

/** One JSON app entry — spec field list, in order. */
function jsonApp(
  app: PlannedApp,
  status: 'planned' | AppStatus
): Record<string, unknown> {
  return {
    name: app.name,
    role: app.role,
    root: app.root,
    config: app.config ?? null,
    bundler: app.bundler,
    port: app.port ?? null,
    url: app.url,
    command: app.commandLine,
    status,
  };
}

/** `--json` plan document (`event: "plan"`, planning-time status). */
export function planToJson(plan: PlannedApp[]): string {
  return JSON.stringify({
    event: 'plan',
    apps: plan.map((app) => jsonApp(app, 'planned')),
  });
}

/** `--json` status document (`event: "status"`, live transitions). */
export function statusToJson(
  plan: PlannedApp[],
  statuses: Record<string, AppStatus>
): string {
  return JSON.stringify({
    event: 'status',
    apps: plan.map((app) => jsonApp(app, statuses[app.name] ?? 'starting')),
  });
}
