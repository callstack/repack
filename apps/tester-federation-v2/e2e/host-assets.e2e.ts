import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('Host Assets screen renders', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible();

  const entry = screen.getByTestId('home-host-assets-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('host-assets-screen')).toBeVisible();
});
