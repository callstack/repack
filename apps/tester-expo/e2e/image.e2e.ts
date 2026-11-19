import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('bundled images load, including one outside the project', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-image-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('image-screen')).toBeVisible();

  await expect(screen.getByTestId('image-local-report')).toHaveText(
    'local: repack.png'
  );
  await expect(screen.getByTestId('image-monorepo-report')).toHaveText(
    'monorepo: logo.png'
  );
});
