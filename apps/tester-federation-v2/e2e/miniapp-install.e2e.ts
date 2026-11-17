import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('install the host mini-app chunk and clear its cache', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-miniapp-install-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('miniapp-install-screen')).toBeVisible();

  await screen.getByTestId('miniapp-install-button').tap();
  await expect(screen.getByTestId('miniapp-install-content')).toBeVisible();

  await screen.getByTestId('miniapp-clear-cache-button').tap();
  await expect(screen.getByTestId('miniapp-install-content')).toBeHidden();
  await expect(screen.getByTestId('miniapp-install-button')).toBeEnabled();
});
