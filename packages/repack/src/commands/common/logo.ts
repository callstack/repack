import * as colorette from 'colorette';
import gradient from 'gradient-string';

const logoStr = `
▄▀▀▀ ▀▀▀▀   █▀▀█ █▀▀█ ▄▀▀▀ █  █
█    ▀▀▀▀   █▀▀▀ █▀▀█ █    █▀▀▄
▀    ▀▀▀▀ ▀ ▀    ▀  ▀  ▀▀▀ ▀  ▀`;

export default function logo(version: string, bundler: string) {
  const gradientLogo = gradient([
    { color: '#9b6dff', pos: 0.45 },
    { color: '#3ce4cb', pos: 0.9 },
  ]).multiline(logoStr);

  return `${gradientLogo}\n${version}, powered by ${colorette.bold(bundler)}\n\n`;
}
