import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('prefetch, load, and invalidate the host remote chunk', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible();

  const entry = screen.getByTestId('home-remote-chunk-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('remote-chunk-screen')).toBeVisible();

  await screen.getByTestId('remote-chunk-prefetch-button').tap();
  await expect(
    screen.getByTestId('remote-chunk-prefetch-button')
  ).toBeDisabled();

  await screen.getByTestId('remote-chunk-load-button').tap();
  await expect(screen.getByTestId('remote-chunk-content')).toBeVisible();

  await screen.getByTestId('remote-chunk-invalidate-button').tap();
  await expect(screen.getByTestId('remote-chunk-content')).toBeHidden();
  await expect(screen.getByTestId('remote-chunk-load-button')).toBeVisible();
  await expect(
    screen.getByTestId('remote-chunk-prefetch-button')
  ).toBeEnabled();
});
