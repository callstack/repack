import * as colorette from 'colorette';
import gradient from 'gradient-string';

/** The raw ASCII art, shared by every consumer that renders the banner. */
export const logoStr = `
▄▀▀▀ ▀▀▀▀   █▀▀█ █▀▀█ ▄▀▀▀ █  █
█    ▀▀▀▀   █▀▀▀ █▀▀█ █    █▀▀▄
▀    ▀▀▀▀ ▀ ▀    ▀  ▀  ▀▀▀ ▀  ▀`;

/** The Re.Pack purple→teal gradient, single source for all banner art. */
export const repackGradient = gradient([
  { color: '#9b6dff', pos: 0.45 },
  { color: '#3ce4cb', pos: 0.9 },
]);

export default function logo(version: string, bundler: string) {
  const gradientLogo = repackGradient.multiline(logoStr);

  return `${gradientLogo}\n${version}, powered by ${colorette.bold(bundler)}\n\n`;
}
