import { readFileSync } from 'node:fs';
import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

const SCALES = [1, 2, 3];

const readOwner = (envFile: URL) =>
  readFileSync(envFile, 'utf8').match(
    /^EXPO_PUBLIC_FEDERATION_OWNER=(.*)$/m
  )?.[1];

const hostOwner = readOwner(new URL('../.env.development', import.meta.url));
const widgetOwner = readOwner(
  new URL('../../tester-expo-widget/.env.development', import.meta.url)
);
const appJson = JSON.parse(
  readFileSync(new URL('../app.json', import.meta.url), 'utf8')
);

test('an Expo-built remote loads inside the Expo host', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-expo-widget-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('expo-widget-screen')).toBeVisible();

  await expect(screen.getByTestId('expo-widget-ready')).toBeVisible({
    timeout: 45_000,
  });
  await expect(screen.getByTestId('expo-widget-host-env-report')).toHaveText(
    `host env: ${hostOwner}`
  );
  await expect(screen.getByTestId('expo-widget-public-environment')).toHaveText(
    `Widget public environment: ${widgetOwner}`
  );
  await expect(screen.getByTestId('expo-widget-native-module')).toHaveText(
    `Native app owner: ${appJson.expo.name}`
  );
  await expect(screen.getByTestId('expo-widget-asset-metadata')).toHaveText(
    'Widget asset type: png'
  );

  const deviceText =
    (await screen
      .getByTestId('expo-widget-device-density-scale')
      .textContent()) ?? '';
  const device = Number(
    deviceText.slice('Widget device density scale: '.length)
  );
  const expected = SCALES.find((scale) => scale >= device) ?? SCALES.at(-1);
  await expect(screen.getByTestId('expo-widget-density-scale')).toHaveText(
    `Selected widget density scale: ${expected}`
  );

  const lazy = screen.getByTestId('expo-widget-lazy-ready');
  await screen.scrollUntilVisible(lazy);
  await expect(lazy).toBeVisible();
});
