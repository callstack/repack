import util from 'node:util';
import Terminal from './Terminal.js';

type Platform = string;

/**
 * Adapter for {@link Terminal} that keeps separate status lines per platform
 * and renders them together as a multi-line status.
 */
class TerminalAdapter extends Terminal {
  private platformStatuses: Map<Platform, string> = new Map();
  private globalStatus = '';

  // Overloads to support both legacy usage and platform-specific status
  status(): string;
  status(format: string, ...args: Array<any>): string;
  status(platform: Platform, format: string, ...args: Array<any>): string;
  status(platformOrFormat?: string, ...args: Array<any>): string {
    // Clear all statuses when called with no args (retain base class semantics)
    if (platformOrFormat === undefined) {
      this.platformStatuses.clear();
      this.globalStatus = '';
      return super.status('');
    }
    // Platform-specific signature: status(platform, format, ...args)
    if (args.length >= 1) {
      const platform = platformOrFormat;
      const format = String(args[0] ?? '');
      const rest = args.slice(1);
      const message = util.format(format, ...rest);

      if (message) {
        this.platformStatuses.set(platform, message);
      } else {
        this.platformStatuses.delete(platform);
      }

      return super.status(this.buildCombinedStatus());
    }

    // Legacy signature: status(format)
    const message = util.format(platformOrFormat);
    this.globalStatus = message;
    return super.status(this.buildCombinedStatus());
  }

  private buildCombinedStatus(): string {
    const lines: string[] = [];

    // Keep insertion order of platforms for a stable multi-line output
    for (const [, status] of this.platformStatuses) {
      if (status) lines.push(status);
    }

    if (this.globalStatus) {
      lines.push(this.globalStatus);
    }

    return lines.join('\n');
  }
}

export default TerminalAdapter;
