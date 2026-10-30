import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('Reanimated spring tracks taps and reset', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-reanimated-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('reanimated-screen')).toBeVisible();

  const width = screen.getByTestId('reanimated-width-report');
  await expect(width).toHaveText('width: 100');

  await screen.getByTestId('reanimated-click-button').tap();
  await expect(width).toHaveText('width: 150');

  await screen.getByTestId('reanimated-click-button').tap();
  await expect(width).toHaveText('width: 200');

  await screen.getByTestId('reanimated-reset-button').tap();
  await expect(width).toHaveText('width: 100');
});
