import { readFileSync } from 'node:fs';
import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

const probeSource = readFileSync(
  new URL('../components/SymbolicationProbe.tsx', import.meta.url),
  'utf8'
);
const throwLine =
  probeSource
    .split('\n')
    .findIndex((line) => line.includes("throw new Error('")) + 1;

test('a stack trace maps back to the source file and line', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-symbolication-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('symbolication-screen')).toBeVisible();

  await screen.getByTestId('symbolication-probe-button').tap();

  await expect(screen.getByTestId('symbolication-frame-report')).toContainText(
    `components/SymbolicationProbe.tsx:${throwLine}`
  );
});
