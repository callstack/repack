import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('Host Assets screen renders', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-host-assets-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('host-assets-screen')).toBeVisible();

  const pic1Mode = screen.getByTestId('host-asset-pic-1-mode-report');
  const pic2Mode = screen.getByTestId('host-asset-pic-2-mode-report');
  const localMode = screen.getByTestId('host-asset-local-mode-report');
  const inlineMode = screen.getByTestId('host-asset-inline-mode-report');
  const localUri = screen.getByTestId('host-asset-local-uri-report');

  await screen.scrollUntilVisible(pic1Mode);
  await expect(pic1Mode).toHaveText('mode: Inlined');
  await screen.scrollUntilVisible(pic2Mode);
  await expect(pic2Mode).toHaveText('mode: Emitted');
  await screen.scrollUntilVisible(localMode);
  await expect(localMode).toHaveText('mode: Emitted');
  await screen.scrollUntilVisible(inlineMode);
  await expect(inlineMode).toHaveText('mode: Inlined');

  await screen.scrollUntilVisible(localUri);
  const uriText = (await localUri.textContent()) ?? '';
  const assetUrl = new URL(uriText.slice('uri: '.length));
  expect(assetUrl.protocol).toBe('http:');
  expect(assetUrl.port).toBe('8081');
  // Android resolves the dev server as 10.0.2.2 and iOS as localhost
  expect(['localhost', '10.0.2.2']).toContain(assetUrl.hostname);

  const probeHost =
    assetUrl.hostname === '10.0.2.2' ? 'localhost' : assetUrl.hostname;
  const response = await fetch(
    `${assetUrl.protocol}//${probeHost}:${assetUrl.port}${assetUrl.pathname}${assetUrl.search}`
  );
  expect(response.status).toBe(200);
});
