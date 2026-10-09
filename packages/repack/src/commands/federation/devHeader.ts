import { logoStr, repackGradient } from '../common/logo.js';

const DESCRIPTION =
  'federation dev — one supervised session for your module-federation workspace';

/**
 * The one-shot session banner `react-native federation-dev` prints before
 * any wizard, plan or status block takes over stdout (start.ts logo
 * precedent). Pure: the caller decides `colors` (TTY and color support) and
 * owns the trailing newline.
 *
 * Color mode reuses the shared gradient ASCII art from `logo.ts` (single
 * source — never a second copy of the art). Plain mode is what CI, pipes
 * and `NO_COLOR` get: text only, zero ANSI bytes.
 */
export function devHeader(
  version: string,
  options: { colors: boolean }
): string {
  if (options.colors) {
    return `${repackGradient.multiline(logoStr)}\n${version} · ${DESCRIPTION}`;
  }
  return `Re.Pack v${version} — federation dev\n${version} · ${DESCRIPTION}`;
}
