import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('a plain Re.Pack remote loads inside the Expo host', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-ordinary-widget-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('ordinary-widget-screen')).toBeVisible();

  await expect(screen.getByTestId('ordinary-repack-widget-ready')).toBeVisible({
    timeout: 45_000,
  });
});
