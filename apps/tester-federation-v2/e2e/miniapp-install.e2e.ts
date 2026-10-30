import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('install, show, and remove the host mini-app chunk', async ({
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
  await expect(screen.getByTestId('miniapp-install-button')).toBeDisabled();

  await screen.getByTestId('miniapp-toggle-button').tap();
  await expect(screen.getByTestId('miniapp-install-content')).toBeVisible();

  await screen.getByTestId('miniapp-toggle-button').tap();
  await expect(screen.getByTestId('miniapp-install-content')).toBeHidden();

  await screen.getByTestId('miniapp-toggle-button').tap();
  await expect(screen.getByTestId('miniapp-install-content')).toBeVisible();

  await screen.getByTestId('miniapp-uninstall-button').tap();
  await expect(screen.getByTestId('miniapp-install-content')).toBeHidden();
  await expect(screen.getByTestId('miniapp-install-button')).toBeEnabled();
  await expect(screen.getByTestId('miniapp-toggle-button')).toBeDisabled();
});
