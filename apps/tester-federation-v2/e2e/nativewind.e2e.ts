import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('NativeWind styles render, respond and switch to dark', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-nativewind-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('nativewind-screen')).toBeVisible();

  const padding = screen.getByTestId('nativewind-padding-report');
  await expect(padding).toHaveText('padding-applied: 16');

  const calcWidth = screen.getByTestId('nativewind-calc-width-report');
  await expect(calcWidth).toHaveText('calc-width: 248');

  const colorScheme = screen.getByTestId('nativewind-color-scheme-report');
  await expect(colorScheme).toHaveText('color-scheme: light');
  await screen.getByTestId('nativewind-dark-mode-button').tap();
  await expect(colorScheme).toHaveText('color-scheme: dark');
  await screen.getByTestId('nativewind-dark-mode-button').tap();
  await expect(colorScheme).toHaveText('color-scheme: light');
});
