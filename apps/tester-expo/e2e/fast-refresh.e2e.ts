import { readFileSync, writeFileSync } from 'node:fs';
import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

const leafFile = new URL('../components/FastRefreshLeaf.tsx', import.meta.url);
const MARKER = 'EXPO_FAST_REFRESH_LEAF_MARKER';
const EDITED = 'EXPO_FAST_REFRESH_LEAF_EDITED';

test('an edit reaches the running app and state survives', async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByTestId('home-screen')).toBeVisible({
    timeout: 30_000,
  });

  const entry = screen.getByTestId('home-fast-refresh-button');
  await screen.scrollUntilVisible(entry);
  await entry.tap();
  await expect(screen.getByTestId('fast-refresh-screen')).toBeVisible();

  const increment = screen.getByTestId('fast-refresh-increment-button');
  await increment.tap();
  await increment.tap();
  await expect(screen.getByTestId('fast-refresh-state-report')).toHaveText(
    'parent state: 2'
  );
  await expect(screen.getByTestId('fast-refresh-leaf-report')).toHaveText(
    MARKER
  );

  const original = readFileSync(leafFile, 'utf8');
  try {
    writeFileSync(leafFile, original.replace(MARKER, EDITED));
    await expect(screen.getByTestId('fast-refresh-leaf-report')).toHaveText(
      EDITED
    );
    await expect(screen.getByTestId('fast-refresh-state-report')).toHaveText(
      'parent state: 2'
    );
  } finally {
    writeFileSync(leafFile, original);
  }
});
