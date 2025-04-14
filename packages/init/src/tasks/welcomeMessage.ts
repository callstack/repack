import { log } from '@clack/prompts';
import dedent from 'dedent';
import gradient from 'gradient-string';

const logo = dedent`
  ▄▀▀▀ ▀▀▀▀   █▀▀█ █▀▀█ ▄▀▀▀ █  █
  █    ▀▀▀▀   █▀▀▀ █▀▀█ █    █▀▀▄
  ▀    ▀▀▀▀ ▀ ▀    ▀  ▀  ▀▀▀ ▀  ▀
`;

export default function welcomeMessage() {
  log.message(
    gradient([
      { color: '#9b6dff', pos: 0.45 },
      { color: '#3ce4cb', pos: 0.9 },
    ]).multiline(logo)
  );
}
