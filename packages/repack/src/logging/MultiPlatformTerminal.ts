import util from 'node:util';
import Terminal from './Terminal.js';

type Platform = string;

/**
 * Terminal that keeps separate status lines per platform
 * and renders them together as a multi-line status.
 */
class MultiPlatformTerminal extends Terminal {
  private platformStatuses: Map<Platform, string> = new Map();

  status(platform: string, ...args: Array<any>): string {
    if (args.length === 0) {
      this.platformStatuses.delete(platform);
      return super.status(this.buildCombinedStatus());
    }

    const message = util.format(...args);

    if (message) {
      this.platformStatuses.set(platform, message);
    } else {
      this.platformStatuses.delete(platform);
    }

    return super.status(this.buildCombinedStatus());
  }

  private buildCombinedStatus(): string {
    const lines: string[] = [];

    for (const [, status] of this.platformStatuses) {
      if (status) lines.push(status);
    }

    return lines.join('\n');
  }
}

export default MultiPlatformTerminal;
