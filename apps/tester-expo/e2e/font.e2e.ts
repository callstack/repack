import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('a bundled font reaches expo-font', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-font-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('font-screen')).toBeVisible();

  await expect(screen.getByTestId('font-load-report')).toHaveText(
    'font: loaded'
  );
});
