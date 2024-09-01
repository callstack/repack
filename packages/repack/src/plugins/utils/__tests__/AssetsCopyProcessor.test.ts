import fs from 'node:fs';
import type { StatsChunk } from '@rspack/core';
import { AssetsCopyProcessor } from '../AssetsCopyProcessor';

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

describe('AssetsCopyProcessor', () => {
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
