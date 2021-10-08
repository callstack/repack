import path from 'path';
import webpack from 'webpack';
import { WebpackLogger } from '../../../../types';
import { AssetsCopyProcessor } from '../AssetsCopyProcessor';

class FsNode {
  value?: string;
  children?: FsNode[];

  constructor(public path: string) {}

  makeDir() {
    if (this.value !== undefined) {
      throw new Error('Node is already a file');
    }

    if (!this.children) {
      this.children = [];
    }
  }

  makeFile(value: string) {
    if (this.children) {
      throw new Error('Node is already a directory');
    }
    this.value = value;
  }

  findDir(dirname: string, create = false): FsNode {
    if (this.value !== undefined || this.children == undefined) {
      throw new Error('not a directory');
    }

    const [currentSegment, ...segments] = dirname.split(path.sep);

    if (currentSegment === '.') {
      return this;
    }

    let foundDir: FsNode | undefined;
    for (const child of this.children) {
      if (child.children && child.path === currentSegment) {
        foundDir = child.findDir(path.join(...segments), create);
      }
    }

    if (!foundDir) {
      if (create) {
        const child = new FsNode(currentSegment);
        child.makeDir();
        this.children.push(child);
        foundDir = child.findDir(path.join(...segments), create);
      } else {
        throw new Error(`directory does not exist: ${dirname}`);
      }
    }

    return foundDir;
  }
}

class FsMock {
  fs: FsNode;

  constructor() {
    this.fs = new FsNode('/');
    this.fs.makeDir();
  }

  async ensureDir(dirname: string) {
    const [, ...segments] = dirname.split(path.sep);
    this.fs.findDir(path.join(...segments), true);
  }

  async copyFile(from: string, to: string) {
    const content = await this.readFile(from);
    await this.writeFile(to, content);
  }

  async readFile(filePath: string) {
    const [, ...segments] = path.dirname(filePath).split(path.sep);
    const dirname = path.join(...segments);
    const basename = path.basename(filePath);

    const dirNode = this.fs.findDir(dirname);
    for (const child of dirNode.children ?? []) {
      if (child.path === basename) {
        if (child.value === undefined) {
          throw new Error('not a file');
        }

        return child.value;
      }
    }

    throw new Error(`no such file: ${filePath}`);
  }

  async writeFile(filePath: string, value: string) {
    const [, ...segments] = path.dirname(filePath).split(path.sep);
    const dirname = path.join(...segments);
    const basename = path.basename(filePath);

    const dirNode = this.fs.findDir(dirname);
    let found = false;
    for (const child of dirNode.children ?? []) {
      if (child.path === basename) {
        if (child.children !== undefined) {
          throw new Error(`not a file: ${filePath}`);
        }

        child.value = value;
        found = true;
        break;
      }
    }

    if (!found) {
      const file = new FsNode(basename);
      file.makeFile(value);
      dirNode.children!.push(file);
    }
  }
}

describe('AssetsCopyProcessor', () => {
  describe('for ios', () => {
    const acpConfigStub = {
      platform: 'ios',
      compilation: {
        assetsInfo: new Map([
          [
            'index.bundle',
            {
              related: {
                sourceMap: 'index.bundle.map',
              },
            },
          ],
          [
            'src_Async_js.chunk.bundle',
            {
              related: {
                sourceMap: 'src_Async_js.chunk.bundle.map',
              },
            },
          ],
        ]),
      } as unknown as webpack.Compilation,
      outputPath: '/dist',
      bundleOutput: '/target/ios/build/Release-iphonesimulator/main.jsbundle',
      bundleOutputDir: '/target/ios/build/Release-iphonesimulator',
      sourcemapOutput:
        '/target/ios/build/Release-iphonesimulator/main.jsbundle.map',
      assetsDest: '/target/ios/build/Release-iphonesimulator/App.app',
      logger: { debug: jest.fn() } as unknown as WebpackLogger,
    };

    it("should copy entry chunk's files into correct directories", async () => {
      const fs = new FsMock();
      await fs.ensureDir('/dist');
      await fs.writeFile(
        '/dist/index.bundle',
        '//# sourceMappingURL=index.bundle.map'
      );
      await fs.writeFile(
        '/dist/index.bundle.map',
        'content of index.bundle.map'
      );
      await fs.ensureDir(
        '/dist/assets/node_modules/react-native/libraries/newappscreen/components'
      );
      await fs.writeFile(
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
        } as unknown as webpack.Chunk,
        { isEntry: true }
      );
      await Promise.all(acp.execute());
      expect(1).toBe(1);

      expect(
        await fs.readFile(
          '/target/ios/build/Release-iphonesimulator/main.jsbundle'
        )
      ).toEqual('//# sourceMappingURL=main.jsbundle.map');
      expect(
        await fs.readFile(
          '/target/ios/build/Release-iphonesimulator/main.jsbundle.map'
        )
      ).toEqual('content of main.jsbundle.map');
      expect(
        await fs.readFile(
          '/target/ios/build/Release-iphonesimulator/App.app/assets/node_modules/react-native/libraries/newappscreen/components/logo.png'
        )
      ).toEqual('image');
    });

    it("should copy regular chunk's files into correct directories", async () => {
      const fs = new FsMock();
      await fs.ensureDir('/dist');
      await fs.writeFile(
        '/dist/src_Async_js.chunk.bundle',
        'content of src_Async_js.chunk.bundle'
      );
      await fs.writeFile(
        '/dist/src_Async_js.chunk.bundle.map',
        'content of src_Async_js.chunk.bundle.map'
      );
      await fs.writeFile(
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
        } as unknown as webpack.Chunk,
        { isEntry: false }
      );
      await Promise.all(acp.execute());

      expect(
        await fs.readFile(
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle'
        )
      ).toEqual('content of src_Async_js.chunk.bundle');
      expect(
        await fs.readFile(
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle.map'
        )
      ).toEqual('content of src_Async_js.chunk.bundle.map');
      expect(
        await fs.readFile(
          '/target/ios/build/Release-iphonesimulator/App.app/src_Async_js.chunk.bundle.json'
        )
      ).toEqual('content of src_Async_js.chunk.bundle.json');
    });
  });

  describe('for android', () => {
    const acpConfigStub = {
      platform: 'android',
      compilation: {
        assetsInfo: new Map([
          [
            'index.bundle',
            {
              related: {
                sourceMap: 'index.bundle.map',
              },
            },
          ],
          [
            'src_Async_js.chunk.bundle',
            {
              related: {
                sourceMap: 'src_Async_js.chunk.bundle.map',
              },
            },
          ],
        ]),
      } as unknown as webpack.Compilation,
      outputPath: '/dist',
      bundleOutput:
        '/target/generated/assets/react/release/index.android.bundle',
      bundleOutputDir: '/target/generated/assets/react/release',
      sourcemapOutput:
        '/target/generated/sourcemaps/react/release/index.android.bundle.map',
      assetsDest: '/target/generated/res/react/release',
      logger: { debug: jest.fn() } as unknown as WebpackLogger,
    };

    it("should copy entry chunk's files into correct directories", async () => {
      const fs = new FsMock();
      await fs.ensureDir('/dist');
      await fs.writeFile(
        '/dist/index.bundle',
        '//# sourceMappingURL=index.bundle'
      );
      await fs.writeFile(
        '/dist/index.bundle.map',
        'content of index.bundle.map'
      );
      await fs.ensureDir('/dist/drawable-mdpi');
      await fs.writeFile(
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
        } as unknown as webpack.Chunk,
        { isEntry: true }
      );
      await Promise.all(acp.execute());

      expect(
        await fs.readFile(
          '/target/generated/assets/react/release/index.android.bundle'
        )
      ).toEqual('//# sourceMappingURL=index.android.bundle.map');
      expect(
        await fs.readFile(
          '/target/generated/sourcemaps/react/release/index.android.bundle.map'
        )
      ).toEqual('content of index.android.bundle.map');
      expect(
        await fs.readFile(
          '/target/generated/res/react/release/drawable-mdpi/node_modules_reactnative_libraries_newappscreen_components_logo.png'
        )
      ).toEqual('image');
    });

    it("should copy regular chunk's files into correct directories", async () => {
      const fs = new FsMock();
      await fs.ensureDir('/dist');
      await fs.writeFile(
        '/dist/src_Async_js.chunk.bundle',
        'content of src_Async_js.chunk.bundle'
      );
      await fs.writeFile(
        '/dist/src_Async_js.chunk.bundle.map',
        'content of src_Async_js.chunk.bundle.map'
      );
      await fs.writeFile(
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
        } as unknown as webpack.Chunk,
        { isEntry: false }
      );
      await Promise.all(acp.execute());

      expect(
        await fs.readFile(
          '/target/generated/assets/react/release/src_Async_js.chunk.bundle'
        )
      ).toEqual('content of src_Async_js.chunk.bundle');
      expect(
        await fs.readFile(
          '/target/generated/sourcemaps/react/release/src_Async_js.chunk.bundle.map'
        )
      ).toEqual('content of src_Async_js.chunk.bundle.map');
      expect(
        await fs.readFile(
          '/target/generated/assets/react/release/src_Async_js.chunk.bundle.json'
        )
      ).toEqual('content of src_Async_js.chunk.bundle.json');
    });
  });
});
