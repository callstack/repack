import * as colorette from 'colorette';

export interface ProgressBarOptions {
  width?: number;
  platform?: string;
  unicode?: boolean;
}

export const IS_SYMBOL_SUPPORTED =
  process.platform !== 'win32' ||
  Boolean(process.env.CI) ||
  process.env.TERM === 'xterm-256color';

function colorizePlatform(text: string, platform?: string): string {
  if (!platform) return colorette.green(text);
  const p = platform.toLowerCase();
  if (p.includes('ios')) return colorette.blue(text);
  if (p.includes('android')) return colorette.green(text);
  return colorette.green(text);
}

export function renderProgressBar(
  percentage: number,
  {
    width = 16,
    platform,
    unicode = IS_SYMBOL_SUPPORTED,
  }: ProgressBarOptions = {}
): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const filled = Math.round((clamped / 100) * width);
  const empty = Math.max(0, width - filled);

  const fullChar = unicode ? '=' : '#';
  const emptyChar = unicode ? '-' : '.';

  const filledStrColored = colorizePlatform(fullChar.repeat(filled), platform);
  const emptyStr = emptyChar.repeat(empty);

  return `[${filledStrColored}${emptyStr}]`;
}

export function colorizePlatformLabel(platform: string, label: string): string {
  const p = platform.toLowerCase();
  if (p.includes('ios')) return colorette.blue(label);
  if (p.includes('android')) return colorette.green(label);
  return label;
}

export class Spinner {
  private index = 0;
  getNext(): string {
    const frames = IS_SYMBOL_SUPPORTED
      ? ['⠋', '⠙', '⠸', '⠴', '⠦', '⠇']
      : ['-', '\\', '|', '/'];
    const frame = frames[this.index % frames.length];
    this.index += 1;
    return frame;
  }
}

export function formatSecondsOneDecimal(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatElapsed(start: number, now: number): string {
  const ms = Math.max(0, now - start);
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function buildInProgressMessageParts(
  platform: string,
  percentage: number,
  options: { width?: number; maxPlatformNameWidth?: number } = {}
): [string, string] {
  const { width = 16, maxPlatformNameWidth = platform.length } = options;
  const bar = renderProgressBar(percentage, { width, platform });
  const percentText = `${Math.floor(percentage).toString().padStart(3, ' ')}%`;
  const barAndPercent = `${bar}${percentText}`;
  const platformPadded = platform.padEnd(maxPlatformNameWidth, ' ');
  const platformColored = colorizePlatformLabel(platform, platformPadded);
  return [barAndPercent, platformColored];
}

export function buildDoneMessageParts(
  platform: string,
  timeMs: number,
  options: { maxPlatformNameWidth?: number } = {}
): [string, string, string, string] {
  const { maxPlatformNameWidth = platform.length } = options;
  const platformPadded = platform.padEnd(maxPlatformNameWidth, ' ');
  const platformColored = colorizePlatformLabel(platform, platformPadded);
  const timeColored = colorizePlatformLabel(
    platform,
    formatSecondsOneDecimal(timeMs)
  );
  return ['Compiled', platformColored, 'in', timeColored];
}
