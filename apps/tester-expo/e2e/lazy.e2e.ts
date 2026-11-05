import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('a local async chunk of the host loads', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-lazy-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('lazy-screen')).toBeVisible();

  await expect(screen.getByTestId('lazy-component-ready')).toBeVisible();
});
