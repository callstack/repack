import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('the host app boots to Home', async ({ app, screen }) => {
  await app.open();

  await expect(screen.getByTestId('home-details-button')).toBeVisible({
    timeout: 60_000,
  });
  await expect(screen.getByTestId('home-gallery-button')).toBeVisible();
});

test('navigates from Home to Detail and back', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('home-details-button')).toBeVisible({
    timeout: 60_000,
  });

  await screen.getByTestId('home-details-button').tap();
  await expect(screen.getByTestId('detail-screen')).toBeVisible();

  await app.back();
  await expect(screen.getByTestId('home-details-button')).toBeVisible();
  await expect(screen.getByTestId('detail-screen')).toBeHidden();
});

test('Home opens the Gallery MiniApp', {
  timeout: 120_000,
}, async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('home-gallery-button')).toBeVisible({
    timeout: 60_000,
  });

  await screen.getByTestId('home-gallery-button').tap();
  await expect(screen.getByTestId('miniapp-gallery')).toBeVisible({
    timeout: 45_000,
  });
  await expect(screen.getByText('Picture 1')).toBeVisible();
});
