import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import rspackCommands from '@callstack/repack/commands/rspack';
import webpackCommands from '@callstack/repack/commands/webpack';
import { globby } from 'globby';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

function ensurePrivateKey(testAppRoot: string) {
  const privateKeyPath = path.join(testAppRoot, 'code-signing.pem');
  if (!fs.existsSync(privateKeyPath)) {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
    fs.writeFileSync(privateKeyPath, pem);
  }
}

describe('codesigning + hermes', () => {
  beforeAll(() => {
    // Ensure signing key exists for the plugin
    ensurePrivateKey(path.join(__dirname, '..'));
  });

  beforeEach(() => {
    // reset test env for each case
    vi.unstubAllEnvs();
  });

  const matrix = [
    { bundler: 'webpack', platform: 'ios' },
    { bundler: 'webpack', platform: 'android' },
    { bundler: 'rspack', platform: 'ios' },
    { bundler: 'rspack', platform: 'android' },
  ] as const;

  it.each(matrix)(
    'produces signed hermes bytecode using $bundler on $platform',
    async ({ bundler, platform }) => {
      const commands = bundler === 'webpack' ? webpackCommands : rspackCommands;
      const bundleCommand = commands.find((c) => c.name === 'bundle');
      if (!bundleCommand) throw new Error('bundle command not found');

      const BASE_DIR = path.join(
        __dirname,
        `out/codesigning-hermes/${bundler}/${platform}`
      );
      const TMP_DIR_BASE = path.join(BASE_DIR, 'base-js');
      const TMP_DIR_SIGNED_HERMES = path.join(BASE_DIR, 'signed-hermes');

      await fs.promises.rm(BASE_DIR, { recursive: true, force: true });

      const config = {
        root: path.join(__dirname, '..'),
        platforms: { ios: {}, android: {} },
        reactNativePath: path.join(__dirname, '../node_modules/react-native'),
      } as const;

      const makeBundle = async (configFile: string, outDir: string) => {
        const mainBundlePath = path.join(
          outDir,
          'react-native-bundle-output',
          platform === 'ios' ? 'main.jsbundle' : `index.${platform}.bundle`
        );
        vi.stubEnv('TEST_WEBPACK_OUTPUT_DIR', outDir);
        vi.stubEnv('REPACK_BUNDLE_FILENAME', mainBundlePath);
        const args = {
          platform,
          config: path.join(__dirname, 'configs', configFile),
          entryFile: 'index.js',
          bundleOutput: mainBundlePath,
          dev: false,
        } as const;
        // @ts-ignore
        await bundleCommand.func([''], config, args);
        // Collect chunk bundles and main bundle
        const chunkFiles = await globby(['**/*.chunk.bundle'], {
          cwd: outDir,
          dot: true,
        });
        const chunkEntries = await Promise.all(
          chunkFiles.map(
            async (file) =>
              [
                file,
                await fs.promises.readFile(path.join(outDir, file)),
              ] as const
          )
        );
        const mainContent = await fs.promises.readFile(mainBundlePath);
        return {
          chunks: Object.fromEntries(chunkEntries) as Record<string, Buffer>,
          main: mainContent,
        };
      };

      const jsAssets = await makeBundle(`${bundler}.config.mjs`, TMP_DIR_BASE);
      const signedHermesAssets = await makeBundle(
        `codesigning-hermes/${bundler}.config.mjs`,
        TMP_DIR_SIGNED_HERMES
      );

      // Ensure we have common chunk file(s)
      expect(Object.keys(jsAssets.chunks).length).toEqual(
        Object.keys(signedHermesAssets.chunks).length
      );

      const MARK = '/* RCSSB */';

      // main bundle is excluded from signing
      expect(jsAssets.main.includes(MARK)).toBe(false);
      expect(signedHermesAssets.main.includes(MARK)).toBe(false);

      // chunk bundles should be transformed to hermes bytecode AND signed
      for (const [file, jsContent] of Object.entries(jsAssets.chunks)) {
        const hermesSignedContent = signedHermesAssets.chunks[file];
        expect(hermesSignedContent).toBeDefined();

        // And the signed content should include the signing marker
        expect(hermesSignedContent.includes(MARK)).toBe(true);

        // Split at the signature marker and compare pre-marker with pure JS output
        const markerIndex = hermesSignedContent.indexOf(MARK);
        expect(markerIndex).toBeGreaterThan(0);
        const preMarker = hermesSignedContent.subarray(0, markerIndex);

        // Hermes transform should change the content vs plain JS
        expect(Buffer.compare(preMarker, jsContent) !== 0).toBe(true);

        // Ensure signature part exists and is non-empty
        const signaturePart = hermesSignedContent.subarray(
          markerIndex + Buffer.from(MARK).length
        );
        expect(signaturePart.length).toBeGreaterThan(0);
      }
    },
    60 * 1000
  );
});
