import util from 'node:util';
import Terminal from './Terminal.js';

const COMPILED_REGEX = /Compiled/;

/**
 * Terminal that keeps separate status lines per platform
 * and renders them together as a multi-line status.
 */
class MultiPlatformTerminal extends Terminal {
  private platformStatuses: Map<string, string> = new Map();

  status(platform: string, ...args: Array<any>): string {
    if (this.checkAllPlatformsDone()) {
      this.persistStatus();
      this.platformStatuses.clear();
      return '';
    }

    this.platformStatuses.set(platform, util.format(...args));
    return super.status(this.buildCombinedStatus());
  }

  private buildCombinedStatus(): string {
    const lines: string[] = [];

    for (const [, status] of this.platformStatuses) {
      if (status) lines.push(status);
    }

    return lines.join('\n');
  }

  private checkAllPlatformsDone(): boolean {
    const statuses = [...this.platformStatuses.values()];
    return Boolean(
      statuses.length && statuses.every((status) => COMPILED_REGEX.test(status))
    );
  }
}

export default MultiPlatformTerminal;
