import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('Async chunk loads through ScriptManager and renders', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-async-chunk-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('async-chunk-screen')).toBeVisible();

  await expect(screen.getByTestId('async-chunk-content')).toBeVisible();
});
