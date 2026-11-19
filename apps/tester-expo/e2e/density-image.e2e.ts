import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

const SCALES = [1, 2, 3];

test('the density variant matching the device is picked', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-density-image-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('density-image-screen')).toBeVisible();

  await expect(screen.getByTestId('density-image-load-report')).toHaveText(
    'image: loaded'
  );

  const pixelRatioText =
    (await screen
      .getByTestId('density-image-pixel-ratio-report')
      .textContent()) ?? '';
  const pixelRatio = Number(pixelRatioText.slice('pixel ratio: '.length));
  const expected = SCALES.find((scale) => scale >= pixelRatio) ?? SCALES.at(-1);
  await expect(screen.getByTestId('density-image-scale-report')).toHaveText(
    `scale: ${expected}`
  );
});
