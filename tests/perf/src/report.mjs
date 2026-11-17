import { METRICS } from './config.mjs';

const STATUS_ICON = {
  fail: '🔴',
  warn: '🟡',
  improved: '🟢',
  ok: '⚪',
};

const STATUS_RANK = { ok: 0, improved: 0, warn: 1, fail: 2 };

function formatValue(value, unit) {
  if (value === undefined) return '–';
  if (unit === 'bytes') {
    const abs = Math.abs(value);
    if (abs >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GB`;
    if (abs >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
    if (abs >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value} B`;
  }
  if (unit === 'ms') {
    return Math.abs(value) >= 1000
      ? `${(value / 1000).toFixed(2)} s`
      : `${Math.round(value)} ms`;
  }
  return String(value);
}

function formatDelta(delta, pct, unit) {
  if (delta === 0) return '0';
  const sign = delta > 0 ? '+' : '-';
  const pctText = Number.isFinite(pct)
    ? ` (${sign}${Math.abs(pct * 100).toFixed(1)}%)`
    : '';
  return `${sign}${formatValue(Math.abs(delta), unit)}${pctText}`;
}

/**
 * Classifies a single metric change. Sampled metrics need both a large median
 * change and non-overlapping samples to fail, which keeps CI noise from
 * failing builds while still catching real regressions.
 */
function classify(metric, head, base, headSamples, baseSamples, noisy) {
  // An "exact" metric that varied between runs of one checkout is handled
  // like a sampled one, so flaky output doesn't fail builds on its own.
  if (noisy) metric = { ...metric, kind: 'sampled', warn: metric.fail ?? 0.01 };
  const delta = head - base;
  const pct = base === 0 ? (delta === 0 ? 0 : Infinity) : delta / base;
  const significant = Math.abs(delta) >= (metric.minDelta ?? 0);

  if (delta === 0 || !significant) return { delta, pct, status: 'ok' };
  const belowWarn =
    Math.abs(pct) < metric.warn &&
    !(metric.failDelta && Math.abs(delta) > metric.failDelta);
  if (metric.kind === 'sampled' && belowWarn) {
    return { delta, pct, status: 'ok' };
  }
  if (delta < 0) return { delta, pct, status: 'improved' };

  let status = pct > metric.warn ? 'warn' : 'ok';
  const exceedsFail =
    metric.fail !== null &&
    (pct > metric.fail || (metric.failDelta && delta > metric.failDelta));
  if (exceedsFail) {
    const separated =
      metric.kind === 'exact' ||
      Math.min(...headSamples) > Math.max(...baseSamples);
    status = separated ? 'fail' : 'warn';
  }
  return { delta, pct, status };
}

export function compareResults(head, base) {
  const fixtures = [];
  let status = 'ok';

  for (const [name, headEntry] of Object.entries(head.fixtures)) {
    const baseEntry = base?.fixtures[name];
    const rows = [];

    const nondeterministic = new Set([
      ...headEntry.nondeterministic,
      ...(baseEntry?.nondeterministic ?? []),
    ]);
    // Only flag nondeterminism the PR introduced; pre-existing flakiness is
    // reported but doesn't affect the status.
    const introducedNondeterminism = baseEntry
      ? headEntry.nondeterministic.filter(
          (key) => !baseEntry.nondeterministic.includes(key)
        )
      : [];

    for (const [key, metric] of Object.entries(METRICS)) {
      const headValue = headEntry.metrics[key];
      const row = {
        key,
        label: metric.label,
        unit: metric.unit,
        head: headValue,
        // Module/chunk counts come from a single build; if that fixture's
        // output is unstable, so are they.
        noisy:
          nondeterministic.has(key) ||
          (nondeterministic.size > 0 && metric.unit === 'count'),
      };
      if (baseEntry) {
        row.base = baseEntry.metrics[key];
        Object.assign(
          row,
          classify(
            metric,
            headValue,
            row.base,
            headEntry.samples.map((s) => s[key]),
            baseEntry.samples.map((s) => s[key]),
            row.noisy
          )
        );
      } else {
        row.status = 'ok';
      }
      if (STATUS_RANK[row.status] > STATUS_RANK[status]) status = row.status;
      rows.push(row);
    }

    let addedFiles = [];
    let removedFiles = [];
    if (baseEntry) {
      const headFiles = Object.keys(headEntry.files);
      const baseFiles = Object.keys(baseEntry.files);
      addedFiles = headFiles.filter((f) => !baseEntry.files[f]);
      removedFiles = baseFiles.filter((f) => !headEntry.files[f]);
      if (
        (addedFiles.length ||
          removedFiles.length ||
          introducedNondeterminism.length) &&
        STATUS_RANK[status] < STATUS_RANK.warn
      ) {
        status = 'warn';
      }
    }

    fixtures.push({
      name,
      rows,
      addedFiles,
      removedFiles,
      nondeterministic: [...nondeterministic],
      introducedNondeterminism,
    });
  }

  return { status, hasBase: Boolean(base), fixtures };
}

export function renderReport(comparison, { runs, platform, node }) {
  const lines = [];
  const headline = {
    fail: '🔴 Performance regression detected',
    warn: '🟡 Performance changed — review the details',
    improved: '🟢 No regressions',
    ok: '⚪ No significant changes',
  }[comparison.status];

  lines.push('## Re.Pack performance benchmark', '');
  lines.push(
    comparison.hasBase
      ? `**${headline}**`
      : 'Measured head only (no base to compare against).'
  );
  lines.push(
    '',
    `<sub>${runs} timed runs per fixture after 1 warmup · ${platform} · Node ${node}. ` +
      'Size metrics are exact; timing and memory are medians and only fail when ' +
      'head and base samples do not overlap.</sub>',
    ''
  );

  for (const fixture of comparison.fixtures) {
    let worst = fixture.rows.reduce(
      (acc, row) =>
        STATUS_RANK[row.status] > STATUS_RANK[acc] ? row.status : acc,
      'ok'
    );
    const fixtureChanged =
      fixture.addedFiles.length ||
      fixture.removedFiles.length ||
      fixture.introducedNondeterminism.length;
    if (fixtureChanged && STATUS_RANK[worst] < STATUS_RANK.warn) worst = 'warn';
    const open = comparison.hasBase && STATUS_RANK[worst] > 0 ? ' open' : '';
    lines.push(
      `<details${open}><summary>${STATUS_ICON[worst]} <b>${fixture.name}</b></summary>`,
      ''
    );
    if (comparison.hasBase) {
      lines.push(
        '| | Metric | Base | Head | Change |',
        '|---|---|---:|---:|---:|'
      );
      for (const row of fixture.rows) {
        const label = row.noisy ? `${row.label} ¹` : row.label;
        lines.push(
          `| ${STATUS_ICON[row.status]} | ${label} | ${formatValue(row.base, row.unit)} | ` +
            `${formatValue(row.head, row.unit)} | ${formatDelta(row.delta, row.pct, row.unit)} |`
        );
      }
    } else {
      lines.push('| Metric | Value |', '|---|---:|');
      for (const row of fixture.rows) {
        const label = row.noisy ? `${row.label} ¹` : row.label;
        lines.push(`| ${label} | ${formatValue(row.head, row.unit)} |`);
      }
    }
    if (fixture.nondeterministic.length) {
      lines.push(
        '',
        '¹ Output differs between runs of the same checkout (nondeterministic ' +
          'build), so this is compared as a median and does not fail on its own.'
      );
    }
    if (fixture.introducedNondeterminism.length) {
      lines.push(
        '',
        `⚠️ This change made the build output nondeterministic ` +
          `(${fixture.introducedNondeterminism.join(', ')} vary between runs; base is stable).`
      );
    }
    if (fixture.addedFiles.length || fixture.removedFiles.length) {
      lines.push('', 'Output files changed:', '');
      for (const file of fixture.addedFiles) lines.push(`- \`+ ${file}\``);
      for (const file of fixture.removedFiles) lines.push(`- \`- ${file}\``);
    }
    lines.push('', '</details>', '');
  }

  return lines.join('\n');
}
