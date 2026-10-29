import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

const EVENTS = [
  'resolving',
  'resolved',
  'loading',
  'loaded',
  'beforeResolve',
  'afterResolve',
  'beforeLoad',
  'afterLoad',
];

test('opening the mini app drives every event and hook', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const gallery = screen.getByTestId('home-gallery-button');
  await screen.scrollUntilVisible(gallery);
  await gallery.tap();
  await expect(screen.getByTestId('miniapp-gallery')).toBeVisible({
    timeout: 45_000,
  });

  await app.back();
  const runtime = screen.getByTestId('home-runtime-events-button');
  await screen.scrollUntilVisible(runtime);
  await runtime.tap();
  await expect(screen.getByTestId('runtime-events-screen')).toBeVisible();

  for (const event of EVENTS) {
    await expect(
      screen.getByTestId(`runtime-event-${event}-report`)
    ).toHaveText(new RegExp(`^${event}: [1-9]\\d*$`));
  }

  await expect(screen.getByTestId('runtime-event-error-report')).toHaveText(
    'error: 0'
  );

  await expect(screen.getByTestId('runtime-events-pipeline-report')).toHaveText(
    'pipeline: settled',
    { timeout: 30_000 }
  );
});
