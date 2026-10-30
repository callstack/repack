import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Peak RSS of `rootPid` and all its descendants, sampled with `ps`. */
export function sampleTreeRSS(rootPid) {
  let peak = 0;
  let stopped = false;
  const tick = async () => {
    while (!stopped) {
      try {
        const { stdout } = await execFileAsync('ps', [
          '-A',
          '-o',
          'pid=,ppid=,rss=',
        ]);
        const children = new Map();
        const rss = new Map();
        for (const line of stdout.trim().split('\n')) {
          const [pid, ppid, kb] = line.trim().split(/\s+/).map(Number);
          rss.set(pid, kb * 1024);
          if (!children.has(ppid)) children.set(ppid, []);
          children.get(ppid).push(pid);
        }
        let total = 0;
        const queue = [rootPid];
        while (queue.length) {
          const pid = queue.pop();
          total += rss.get(pid) ?? 0;
          queue.push(...(children.get(pid) ?? []));
        }
        peak = Math.max(peak, total);
      } catch {
        // The process may exit between spawn and sampling.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };
  const done = tick();
  return async () => {
    stopped = true;
    await done;
    return peak;
  };
}
