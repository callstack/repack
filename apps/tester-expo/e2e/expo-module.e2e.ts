import { readFileSync } from 'node:fs';
import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

const appJson = JSON.parse(
  readFileSync(new URL('../app.json', import.meta.url), 'utf8')
);

test('an Expo native module answers the Re.Pack bundle', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-expo-module-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('expo-module-screen')).toBeVisible();

  await expect(screen.getByTestId('expo-module-app-name-report')).toHaveText(
    `app name: ${appJson.expo.name}`
  );
});
