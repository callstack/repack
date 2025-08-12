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

describe('codesigning', () => {
  describe.each([
    { bundler: 'webpack', commands: webpackCommands },
    { bundler: 'rspack', commands: rspackCommands },
  ])('using $bundler', ({ bundler, commands }) => {
    const bundleCommand = commands.find((command) => command.name === 'bundle');
    if (!bundleCommand) throw new Error('bundle command not found');

    describe.each([{ platform: 'ios' }, { platform: 'android' }])(
      'on $platform',
      ({ platform }) => {
        const BASE_DIR = path.join(
          __dirname,
          `out/codesigning/${bundler}/${platform}`
        );
        const TMP_DIR_NO = path.join(BASE_DIR, 'no-cs');
        const TMP_DIR_CS = path.join(BASE_DIR, 'cs');

        beforeAll(async () => {
          await fs.promises.rm(BASE_DIR, { recursive: true, force: true });
          // Ensure signing key exists for the plugin
          ensurePrivateKey(path.join(__dirname, '..'));
        });

        beforeEach(() => {
          // reset test env each case, we pass dir explicitly inside
          vi.unstubAllEnvs();
        });

        it(
          'adds signature with RCSSB marker to bundles',
          async () => {
            const config = {
              root: path.join(__dirname, '..'),
              platforms: { ios: {}, android: {} },
              reactNativePath: path.join(
                __dirname,
                '../node_modules/react-native'
              ),
            };

            const makeBundle = async (configFile: string, outDir: string) => {
              const mainBundlePath = path.join(
                outDir,
                'react-native-bundle-output',
                platform === 'ios'
                  ? 'main.jsbundle'
                  : `index.${platform}.bundle`
              );
              vi.stubEnv('TEST_WEBPACK_OUTPUT_DIR', outDir);
              vi.stubEnv('REPACK_BUNDLE_FILENAME', mainBundlePath);
              const args = {
                platform,
                entryFile: 'index.js',
                bundleOutput: mainBundlePath,
                dev: false,
                webpackConfig: path.join(__dirname, 'configs', configFile),
              };
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
                chunks: Object.fromEntries(chunkEntries),
                main: mainContent,
              };
            };

            const jsAssets = await makeBundle(
              `${bundler}.config.mjs`,
              TMP_DIR_NO
            );
            const signedAssets = await makeBundle(
              `codesigning/${bundler}.config.mjs`,
              TMP_DIR_CS
            );

            // Ensure we have common chunk file(s)
            expect(Object.keys(jsAssets.chunks).length).toEqual(
              Object.keys(signedAssets.chunks).length
            );

            const MARK = '/* RCSSB */';

            // main bundle is excluded from signing
            expect(jsAssets.main.includes(MARK)).toBe(false);
            expect(signedAssets.main.includes(MARK)).toBe(false);

            // chunk bundles should be signed
            for (const [file, jsContent] of Object.entries(jsAssets.chunks)) {
              const signedContent = signedAssets.chunks[file];
              expect(signedContent).toBeDefined();
              expect(jsContent.includes(MARK)).toBe(false);
              expect(signedContent.includes(MARK)).toBe(true);
            }
          },
          60 * 1000
        );
      }
    );
  });
});
