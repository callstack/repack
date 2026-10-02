import type { PlannedApp } from '../devPlan.js';
import {
  planToJson,
  renderPlanTable,
  renderStatusTable,
  statusToJson,
} from '../statusTable.js';

const host: PlannedApp = {
  name: 'host',
  role: 'host',
  root: '/ws',
  config: '/ws/config.host-app.mts',
  bundler: 'rspack',
  port: 8081,
  url: 'http://localhost:8081',
  spawn: { file: 'node', args: [], cwd: '/ws' },
  commandLine: 'node /rn/cli.js start --port 8081',
};

const mini: PlannedApp = {
  name: 'MiniApp',
  role: 'remote',
  root: '/ws',
  bundler: 'rspack',
  url: 'http://localhost:<auto>',
  spawn: { file: 'node', args: [], cwd: '/ws' },
  commandLine: 'node /rn/cli.js start --port <auto>',
};

/** Collapse column padding to single spaces: content-level golden. */
const norm = (rows: string[]) =>
  rows.map((row) => row.split(/\s+/).filter(Boolean).join(' '));

describe('renderPlanTable', () => {
  it('renders deterministic ASCII rows, host first, one line per app', () => {
    const rows = renderPlanTable([host, mini]);
    // Exact golden (approval-verified): deterministic, fixed-width ASCII.
    expect(rows).toEqual([
      'PLAN',
      'app      config                   port  url',
      'host     /ws/config.host-app.mts  8081  http://localhost:8081',
      'MiniApp  -                        auto  http://localhost:<auto>',
    ]);
    expect(norm(rows)).toEqual([
      'PLAN',
      'app config port url',
      'host /ws/config.host-app.mts 8081 http://localhost:8081',
      'MiniApp - auto http://localhost:<auto>',
    ]);
    for (const row of rows) {
      expect(row).not.toMatch(/[^\x20-\x7e]/); // printable ASCII only
    }
    // Fixed-width columns: every row shares the column start offsets.
    const header = rows[1]!;
    expect(header.length).toBeGreaterThan(0);
    for (const row of rows.slice(2)) {
      expect(row.indexOf('http://')).toBe(header.indexOf('url'));
    }
  });

  it('is byte-identical across identical inputs (CI-deterministic)', () => {
    expect(renderPlanTable([host, mini])).toEqual(
      renderPlanTable([host, mini])
    );
  });
});

describe('renderStatusTable', () => {
  it('renders health rows with the planned ports and URLs', () => {
    const rows = renderStatusTable([host, mini], {
      host: 'running',
      MiniApp: 'starting',
    });
    expect(rows).toEqual([
      'STATUS',
      'app      port  url                      health',
      'host     8081  http://localhost:8081    running',
      'MiniApp  auto  http://localhost:<auto>  starting',
    ]);
    expect(norm(rows)).toEqual([
      'STATUS',
      'app port url health',
      'host 8081 http://localhost:8081 running',
      'MiniApp auto http://localhost:<auto> starting',
    ]);
  });
});

describe('JSON output contract', () => {
  it('emits exactly the event/apps envelope with the spec field list', () => {
    const doc = JSON.parse(planToJson([host, mini]));
    expect(Object.keys(doc)).toEqual(['event', 'apps']);
    expect(doc.event).toBe('plan');
    expect(Object.keys(doc.apps[0])).toEqual([
      'name',
      'role',
      'root',
      'config',
      'bundler',
      'port',
      'url',
      'command',
      'status',
    ]);
    expect(doc.apps).toEqual([
      {
        name: 'host',
        role: 'host',
        root: '/ws',
        config: '/ws/config.host-app.mts',
        bundler: 'rspack',
        port: 8081,
        url: 'http://localhost:8081',
        command: 'node /rn/cli.js start --port 8081',
        status: 'planned',
      },
      {
        name: 'MiniApp',
        role: 'remote',
        root: '/ws',
        config: null,
        bundler: 'rspack',
        port: null,
        url: 'http://localhost:<auto>',
        command: 'node /rn/cli.js start --port <auto>',
        status: 'planned',
      },
    ]);
  });

  it('emits live status docs with the transitioned statuses', () => {
    const doc = JSON.parse(
      statusToJson([host, mini], { host: 'running', MiniApp: 'failed' })
    );
    expect(doc.event).toBe('status');
    expect(doc.apps.map((app: { status: string }) => app.status)).toEqual([
      'running',
      'failed',
    ]);
  });
});
