import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('Gallery MiniApp loads and renders its own navigator', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-gallery-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();

  await expect(screen.getByTestId('miniapp-gallery')).toBeVisible({
    timeout: 45_000,
  });
  await expect(screen.getByText('Picture 1')).toBeVisible();
});
