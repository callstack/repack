import dedent from 'dedent';
import colorette from 'colorette';
import type { Stats as RspackStats } from '@rspack/core';
import type { Stats as WebpackStats } from 'webpack';

function formatTime(ms: number) {
  return (ms / 1000).toFixed(2) + 's';
}

export function printSummary(stats: RspackStats | WebpackStats) {
  const statsData = stats.toJson({
    all: false,
    assets: true,
    modules: true,
    timings: true,
  });

  const assetsCount = statsData.assets!.length;
  const modulesCount = statsData.modules!.length;
  const compilationTime = statsData.time!;

  const output = dedent(`
  ─────────────────────────
   📦 Assets:\t${colorette.green(assetsCount.toString()).padStart(18)}
   📄 Modules:\t${colorette.green(modulesCount.toString()).padStart(18)}
   🕓 Time:\t${colorette.green(formatTime(compilationTime)).padStart(18)}
  ─────────────────────────`);

  process.stdout.write(output + '\n\r');
}
