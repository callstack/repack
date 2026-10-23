import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('Detail screen renders and goes back to Home', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible();

  const entry = screen.getByTestId('home-details-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('details-screen')).toBeVisible();

  await app.back();
  await expect(screen.getByTestId('details-screen')).toBeHidden();
  await expect(screen.getByTestId('home-details-button')).toBeVisible();
});
