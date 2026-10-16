import fs from 'node:fs';
import path from 'node:path';
import type { StatsChunk } from '@rspack/core';
import { vol } from 'memfs';
import { AssetsCopyProcessor } from '../AssetsCopyProcessor.js';

jest.mock('node:fs', () => jest.requireActual('memfs').fs);

const mkdirp = (path: string) => {
  return fs.mkdirSync(path, { recursive: true });
};
const write = (path: string, content: string) => {
  return fs.writeFileSync(path, content);
};
const read = (path: string) => {
  return fs.readFileSync(path, 'utf-8');
};
const makeChunk = (
  file: string,
  auxiliaryFiles: string[],
  isEntry = true
): StatsChunk => ({
  type: 'chunk',
  rendered: true,
  initial: isEntry,
  entry: isEntry,
  size: 0,
  files: [file],
  auxiliaryFiles,
});

describe('AssetsCopyProcessor', () => {
  beforeEach(() => {
    vol.reset();
  });

  describe('for ios', () => {
    const acpConfigStub = {
      platform: 'ios',
      outputPath: '/dist',
      bundleOutput: '/target/ios/build/Release-iphonesimulator/main.jsbundle',
      bundleOutputDir: '/target/ios/build/Release-iphonesimulator',
      sourcemapOutput:
        '/target/ios/build/Release-iphonesimulator/main.jsbundle.map',
      assetsDest: '/target/ios/build/Release-iphonesimulator/App.app',
      logger: { debug: jest.fn() },
    };

    it("should copy entry chunk's files into correct directories", async () => {
      mkdirp('/dist');
      write('/dist/index.bundle', '//# sourceMappingURL=index.bundle.map');
      write('/dist/index.bundle.map', 'content of index.bundle.map');
      mkdirp(
        '/dist/assets/node_modules/react-native/libraries/newappscreen/components'
      );
      write(
        '/dist/assets/node_modules/react-native/libraries/newappscreen/components/logo.png',
        'image'
      );

      const acp = new AssetsCopyProcessor(acpConfigStub, fs as any);
      acp.enqueueChunk(
        {
          files: ['index.bundle'],
          auxiliaryFiles: [
            'assets/node_modules/react-native/libraries/newappscreen/components/logo.png',
            'index.bundle.map',
          ],
        } as unknown as StatsChunk,
        { isEntry: true, sourceMapFile: 'index.bundle.map' }
      );
      await Promise.all(acp.execute());
      expect(1).toBe(1);

      expect(
        read('/target/ios/build/Release-iphonesimulator/main.jsbundle')
      ).toEqual('//# sourceMappingURL=main.jsbundle.map');
      expect(
        read('/target/ios/build/Release-iphonesimulator/main.jsbundle.map')
      ).toEqual('content of main.jsbundle.map');
      expect(
        read(
          '/target/ios/build/Release-iphonesimulator/App.app/assets/node_modules/react-native/libraries/newappscreen/components/logo.png'
        )
      ).toEqual('image');
    });

    it("should copy regular chunk's files into correct directories", async () => {
      mkdirp('/dist');
      write(
        '/dist/src_Async_js.chunk.bundle',
        'content of src_Async_js.chunk.bundle'
      );
      write(
        '/dist/src_Async_js.chunk.bundle.map',
        'content of src_Async_js.chunk.bundle.map'
      );
      write(
        '/dist/src_Async_js.chunk.bundle.json',
        'content of src_Async_js.chunk.bundle.json'
      );

      const acp = new AssetsCopyProcessor(acpConfigStub, fs as any);
      acp.enqueueChunk(
        {
          files: ['src_Async_js.chunk.bundle'],
          auxiliaryFiles: [
            'src_Async_js.chunk.bundle.map',
            'src_Async_js.chunk.bundle.json',
          ],
        } as unknown as StatsChunk,
        { isEntry: false, sourceMapFile: 'src_Async_js.chunk.bundle.map' }
      );
      await Promise.all(acp.execute());

      expect(
        read(
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle'
        )
      ).toEqual('content of src_Async_js.chunk.bundle');
      expect(
        read(
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle.map'
        )
      ).toEqual('content of src_Async_js.chunk.bundle.map');
      expect(
        read(
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle.json'
        )
      ).toEqual('content of src_Async_js.chunk.bundle.json');
    });
  });

  describe('for android', () => {
    const acpConfigStub = {
      platform: 'android',
      outputPath: '/dist',
      bundleOutput:
        '/target/generated/assets/react/release/index.android.bundle',
      bundleOutputDir: '/target/generated/assets/react/release',
      sourcemapOutput:
        '/target/generated/sourcemaps/react/release/index.android.bundle.map',
      assetsDest: '/target/generated/res/react/release',
      logger: { debug: jest.fn() },
    };

    it("should copy entry chunk's files into correct directories", async () => {
      mkdirp('/dist');
      write('/dist/index.bundle', '//# sourceMappingURL=index.bundle');
      write('/dist/index.bundle.map', 'content of index.bundle.map');
      mkdirp('/dist/drawable-mdpi');
      write(
        '/dist/drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png',
        'image'
      );

      const acp = new AssetsCopyProcessor(acpConfigStub, fs as any);
      acp.enqueueChunk(
        {
          files: ['index.bundle'],
          auxiliaryFiles: [
            'drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png',
            'index.bundle.map',
          ],
        } as unknown as StatsChunk,
        { isEntry: true, sourceMapFile: 'index.bundle.map' }
      );
      acp.enqueueAndroidKeepFile();
      await Promise.all(acp.execute());

      expect(
        read('/target/generated/assets/react/release/index.android.bundle')
      ).toEqual('//# sourceMappingURL=index.android.bundle.map');
      expect(
        read(
          '/target/generated/sourcemaps/react/release/index.android.bundle.map'
        )
      ).toEqual('content of index.android.bundle.map');
      expect(
        read(
          '/target/generated/res/react/release/drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png'
        )
      ).toEqual('image');
      expect(read('/target/generated/res/react/release/raw/keep.xml')).toEqual(
        '<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@drawable/node_modules_reactnative_libraries_newappscreen_components_logo" />\n'
      );
    });

    it('should keep resources from all local chunks, deduplicating density variants', async () => {
      const entryAssets = [
        'drawable-mdpi/assets_logo.png',
        'raw/assets_inter.otf',
        'font/assets_inter.otf',
        'index.bundle.map',
        'index.bundle.json',
        'remote-assets/assets/remote.png',
      ];
      const chunkAssets = [
        'drawable-xhdpi/assets_logo.png',
        'raw/assets_clip.mp4',
        'font/assets_family.xml',
      ];
      for (const file of [
        'index.bundle',
        'async.chunk.bundle',
        ...entryAssets,
        ...chunkAssets,
      ]) {
        mkdirp(path.dirname(`/dist/${file}`));
        write(`/dist/${file}`, 'content');
      }

      const acp = new AssetsCopyProcessor(acpConfigStub, fs as any);
      acp.enqueueChunk(makeChunk('index.bundle', entryAssets), {
        isEntry: true,
        sourceMapFile: 'index.bundle.map',
      });
      acp.enqueueChunk(makeChunk('async.chunk.bundle', chunkAssets, false), {
        isEntry: false,
      });
      acp.enqueueAndroidKeepFile();
      await Promise.all(acp.execute());

      expect(read(`${acpConfigStub.assetsDest}/raw/keep.xml`)).toEqual(
        '<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@drawable/assets_logo,@font/assets_family,@font/assets_inter,@raw/assets_clip,@raw/assets_inter" />\n'
      );
      expect(read(`${acpConfigStub.assetsDest}/raw/assets_inter.otf`)).toBe(
        'content'
      );
      expect(read(`${acpConfigStub.assetsDest}/font/assets_inter.otf`)).toBe(
        'content'
      );
      expect(
        fs.existsSync(
          `${acpConfigStub.assetsDest}/remote-assets/assets/remote.png`
        )
      ).toBe(false);
    });

    it.each([{ assets: [] }, { assets: ['assets/Inter.otf'] }])(
      'should not create a keep file when no Android resources are copied ($assets)',
      async ({ assets }) => {
        mkdirp('/dist/assets');
        write('/dist/index.bundle', 'bundle');
        write('/dist/assets/Inter.otf', 'font');
        const acp = new AssetsCopyProcessor(acpConfigStub, fs as any);
        acp.enqueueChunk(makeChunk('index.bundle', assets), { isEntry: true });
        acp.enqueueAndroidKeepFile();
        await Promise.all(acp.execute());

        expect(fs.existsSync(`${acpConfigStub.assetsDest}/raw/keep.xml`)).toBe(
          false
        );
      }
    );

    it('should not create a keep file for iOS', async () => {
      mkdirp('/dist/raw');
      write('/dist/index.bundle', 'bundle');
      write('/dist/raw/inter.otf', 'font');
      const acp = new AssetsCopyProcessor(
        { ...acpConfigStub, platform: 'ios' },
        fs as any
      );
      acp.enqueueChunk(makeChunk('index.bundle', ['raw/inter.otf']), {
        isEntry: true,
      });
      acp.enqueueAndroidKeepFile();
      await Promise.all(acp.execute());

      expect(fs.existsSync(`${acpConfigStub.assetsDest}/raw/keep.xml`)).toBe(
        false
      );
    });

    it('should not create a keep file unless it is enqueued', async () => {
      mkdirp('/dist/raw');
      write('/dist/index.bundle', 'bundle');
      write('/dist/raw/inter.otf', 'font');
      const acp = new AssetsCopyProcessor(acpConfigStub, fs as any);
      acp.enqueueChunk(makeChunk('index.bundle', ['raw/inter.otf']), {
        isEntry: true,
      });
      await Promise.all(acp.execute());

      expect(read(`${acpConfigStub.assetsDest}/raw/inter.otf`)).toBe('font');
      expect(fs.existsSync(`${acpConfigStub.assetsDest}/raw/keep.xml`)).toBe(
        false
      );
    });

    it("should copy regular chunk's files into correct directories", async () => {
      mkdirp('/dist');
      write(
        '/dist/src_Async_js.chunk.bundle',
        'content of src_Async_js.chunk.bundle'
      );
      write(
        '/dist/src_Async_js.chunk.bundle.map',
        'content of src_Async_js.chunk.bundle.map'
      );
      write(
        '/dist/src_Async_js.chunk.bundle.json',
        'content of src_Async_js.chunk.bundle.json'
      );

      const acp = new AssetsCopyProcessor(acpConfigStub, fs as any);
      acp.enqueueChunk(
        {
          files: ['src_Async_js.chunk.bundle'],
          auxiliaryFiles: [
            'src_Async_js.chunk.bundle.map',
            'src_Async_js.chunk.bundle.json',
          ],
        } as unknown as StatsChunk,
        { isEntry: false, sourceMapFile: 'src_Async_js.chunk.bundle.map' }
      );
      await Promise.all(acp.execute());

      expect(
        read('/target/generated/assets/react/release/src_Async_js.chunk.bundle')
      ).toEqual('content of src_Async_js.chunk.bundle');
      expect(
        read(
          '/target/generated/sourcemaps/react/release/src_Async_js.chunk.bundle.map'
        )
      ).toEqual('content of src_Async_js.chunk.bundle.map');
      expect(
        read(
          '/target/generated/assets/react/release/src_Async_js.chunk.bundle.json'
        )
      ).toEqual('content of src_Async_js.chunk.bundle.json');
    });
  });
});
