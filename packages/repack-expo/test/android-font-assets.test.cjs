const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { rspack } = require('@rspack/core');
const {
  configureAndroidFontAssets,
} = require('../dist/rspack/assets/configureAndroidFontAssets.js');

const fontAssetName = 'font/assets_fonts_materialsymbolsregular.ttf';
const rawAssetName = 'raw/assets_fonts_materialsymbolsregular.ttf';
const additionalBinaryFontAssets = new Map([
  ['font/display.OTF', 'raw/display.OTF'],
  ['font/icons.ttc', 'raw/icons.ttc'],
]);
const fontContents = Buffer.from('fixture-font-contents');
const fontInfo = {
  immutable: true,
  sourceFilename: 'assets/fonts/material-symbols-regular.ttf',
};
const fontFamilyAssetName = 'font/material_symbols.xml';

class EmitFixtureFontPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'EmitFixtureFontPlugin',
      (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'EmitFixtureFontPlugin',
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
          },
          () => {
            compilation.emitAsset(
              fontAssetName,
              new compiler.webpack.sources.RawSource(fontContents),
              fontInfo
            );
            for (const assetName of additionalBinaryFontAssets.keys()) {
              compilation.emitAsset(
                assetName,
                new compiler.webpack.sources.RawSource(assetName)
              );
            }
            compilation.emitAsset(
              fontFamilyAssetName,
              new compiler.webpack.sources.RawSource('<font-family />')
            );
          }
        );
      }
    );
  }
}

async function compile({ mode, platform }) {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'repack-expo-font-assets-')
  );
  fs.writeFileSync(path.join(projectRoot, 'index.js'), 'export default 42;');

  const compiler = rspack({
    context: projectRoot,
    entry: './index.js',
    mode,
    name: platform,
    output: {
      filename: 'main.js',
      path: path.join(projectRoot, 'dist'),
    },
    plugins: [
      new EmitFixtureFontPlugin(),
      {
        apply(compiler) {
          configureAndroidFontAssets(compiler, platform);
        },
      },
    ],
  });

  try {
    return await new Promise((resolve, reject) => {
      compiler.run((error, stats) => {
        if (error) return reject(error);
        if (!stats) return reject(new Error('Rspack returned no stats'));
        if (stats.hasErrors()) {
          return reject(
            new Error(stats.toString({ all: false, errors: true }))
          );
        }

        resolve(stats.compilation);
      });
    });
  } finally {
    await new Promise((resolve) => compiler.close(resolve));
    fs.rmSync(projectRoot, { force: true, recursive: true });
  }
}

test('moves Android production font assets to raw without changing source or info', async () => {
  const compilation = await compile({
    mode: 'production',
    platform: 'android',
  });

  assert.equal(compilation.getAsset(fontAssetName), undefined);
  const renamedFont = compilation.getAsset(rawAssetName);
  assert.ok(renamedFont);
  assert.deepEqual(Buffer.from(renamedFont.source.buffer()), fontContents);
  assert.equal(renamedFont.info.immutable, fontInfo.immutable);
  assert.equal(renamedFont.info.sourceFilename, fontInfo.sourceFilename);
  for (const [originalName, renamedName] of additionalBinaryFontAssets) {
    assert.equal(compilation.getAsset(originalName), undefined);
    assert.ok(compilation.getAsset(renamedName));
  }
  assert.ok(compilation.getAsset(fontFamilyAssetName));
  assert.equal(compilation.getAsset('raw/material_symbols.xml'), undefined);
});

test('leaves Android development font assets unchanged', async () => {
  const compilation = await compile({
    mode: 'development',
    platform: 'android',
  });

  assert.ok(compilation.getAsset(fontAssetName));
  assert.equal(compilation.getAsset(rawAssetName), undefined);
  for (const [originalName, renamedName] of additionalBinaryFontAssets) {
    assert.ok(compilation.getAsset(originalName));
    assert.equal(compilation.getAsset(renamedName), undefined);
  }
});

test('leaves iOS production font assets unchanged', async () => {
  const compilation = await compile({ mode: 'production', platform: 'ios' });

  assert.ok(compilation.getAsset(fontAssetName));
  assert.equal(compilation.getAsset(rawAssetName), undefined);
  for (const [originalName, renamedName] of additionalBinaryFontAssets) {
    assert.ok(compilation.getAsset(originalName));
    assert.equal(compilation.getAsset(renamedName), undefined);
  }
});
