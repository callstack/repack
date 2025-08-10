import util from 'node:util';
import Terminal from './Terminal.js';

type Platform = string;

/**
 * Terminal that keeps separate status lines per platform
 * and renders them together as a multi-line status.
 */
class MultiPlatformTerminal extends Terminal {
  private platformStatuses: Map<Platform, string> = new Map();
  private finalizedPlatforms: Set<Platform> = new Set();

  status(platform: string, ...args: Array<any>): string {
    if (args.length === 0) {
      this.platformStatuses.delete(platform);
      return super.status(this.buildCombinedStatus());
    }

    // Any new progress invalidates previous finalization for this platform
    this.finalizedPlatforms.delete(platform);

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

  /**
   * Finalize a platform: remove it from the live status area and print the final line once.
   */
  finalize(platform: string, finalMessage: string): void {
    if (this.finalizedPlatforms.has(platform)) {
      return;
    }

    this.finalizedPlatforms.add(platform);
    this.platformStatuses.delete(platform);

    const combined = this.buildCombinedStatus();
    if (combined.length > 0) {
      super.status(combined);
    } else {
      // Clear all live status lines (no-arg semantics)
      super.status('');
    }

    // Log the final message once
    super.log('%s', finalMessage);
  }
}

export default MultiPlatformTerminal;
