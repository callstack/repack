import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import crypto from 'node:crypto';
import { SCALABLE_ASSETS, SCALABLE_RESOLUTIONS } from '../../utils';
import { getOptions } from './options';
import { extractAssets } from './extractAssets';
import { inlineAssets } from './inlineAssets';
import { convertToRemoteAssets } from './convertToRemoteAssets';
import { collectScales, getScaleNumber } from './utils';
import type { Asset, AssetLoaderContext } from './types';

export const raw = true;

const testXml = /\.(xml)$/;
const testMP4 = /\.(mp4)$/;
const testImages = /\.(png|jpg|gif|webp)$/;
const testFonts = /\.(ttf|otf|ttc)$/;

export default async function repackAssetsLoader(
  this: AssetLoaderContext,
  content: Buffer
) {
  this.cacheable();
  const id = crypto.randomBytes(16).toString('hex');
  // console.time(`repackAssetsLoader - ${id}`);
  console.time(`repackAssetsLoader - ${id} - 1`);
  const callback = this.async();
  const logger = this.getLogger('repackAssetsLoader');
  const rootContext = this.rootContext;

  logger.debug(`Processing asset ${this.resourcePath}`);

  try {
    const options = getOptions(this);

    // defaults
    const scalableAssetExtensions =
      options.scalableAssetExtensions ?? SCALABLE_ASSETS;
    const scalableAssetResolutions =
      options.scalableAssetResolutions ?? SCALABLE_RESOLUTIONS;

    // const parsedPath = path.parse(this.resourcePath);
    // console.log(parsedPath);
    const pathSeparatorRegexp = new RegExp(`\\${path.sep}`, 'g');
    const resourcePath = this.resourcePath;
    const resourceAbsoluteDirname = path.dirname(resourcePath);
    // Relative path to rootContext without any ../ due to https://github.com/callstack/haul/issues/474
    // Assets from from outside of rootContext, should still be placed inside bundle output directory.
    // Example:
    //   resourcePath    = <abs>/monorepo/node_modules/my-module/image.png
    //   dirname         = <abs>/monorepo/node_modules/my-module
    //   rootContext     = <abs>/monorepo/packages/my-app/
    //   resourceDirname = ../../node_modules/my-module (original)
    // So when we calculate destination for the asset for iOS (assetsDirname + resourceDirname + filename),
    // it will end up outside of `assets` directory, so we have to make sure it's:
    //   resourceDirname = node_modules/my-module (tweaked)
    const resourceDirname = path
      .relative(rootContext, resourceAbsoluteDirname)
      .replace(new RegExp(`^[\\.\\${path.sep}]+`), '');
    const resourceExtensionType = path.extname(resourcePath).replace(/^\./, '');
    const suffixPattern = `(@\\d+(\\.\\d+)?x)?(\\.(${options.platform}|native))?\\.${resourceExtensionType}$`;
    const resourceFilename = path
      .basename(resourcePath)
      .replace(new RegExp(suffixPattern), '');
    // Name with embedded resourceDirname eg `node_modules_reactnative_libraries_newappscreen_components_logo.png`
    const resourceNormalizedFilename = `${(resourceDirname.length === 0
      ? resourceFilename
      : `${resourceDirname.replace(
          pathSeparatorRegexp,
          '_'
        )}_${resourceFilename}`
    )
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')}.${resourceExtensionType}`;

    const assetsDirname = 'assets';
    const remoteAssetsDirname = 'remote-assets';

    const scales = await collectScales(
      resourceAbsoluteDirname,
      resourceFilename,
      resourceExtensionType,
      scalableAssetExtensions,
      scalableAssetResolutions,
      util.promisify(this.fs.readdir)
    );
    console.timeEnd(`repackAssetsLoader - ${id} - 1`);
    const scaleKeys = Object.keys(scales).sort(
      (a, b) => getScaleNumber(a) - getScaleNumber(b)
    );

    for (const scaleKey of scaleKeys) {
      const filenameWithScale = scales[scaleKey];
      this.addDependency(filenameWithScale);
    }

    const assets = await Promise.all<Asset>(
      scaleKeys.map(async (scaleKey) => {
        const filenameWithScale = scales[scaleKey];
        const content = fs.readFileSync(filenameWithScale);

        let destination;

        if (
          !options.devServerEnabled &&
          !options.remote?.enabled &&
          options.platform === 'android'
        ) {
          // found font family
          if (
            testXml.test(resourceNormalizedFilename) &&
            content?.indexOf('font-family') !== -1
          ) {
            destination = 'font';
          } else if (testFonts.test(resourceNormalizedFilename)) {
            // font extensions
            destination = 'font';
          } else if (testMP4.test(resourceNormalizedFilename)) {
            // video files extensions
            destination = 'raw';
          } else if (
            testImages.test(resourceNormalizedFilename) ||
            testXml.test(resourceNormalizedFilename)
          ) {
            // images extensions
            switch (scaleKey) {
              case '@0.75x':
                destination = 'drawable-ldpi';
                break;
              case '@1x':
                destination = 'drawable-mdpi';
                break;
              case '@1.5x':
                destination = 'drawable-hdpi';
                break;
              case '@2x':
                destination = 'drawable-xhdpi';
                break;
              case '@3x':
                destination = 'drawable-xxhdpi';
                break;
              case '@4x':
                destination = 'drawable-xxxhdpi';
                break;
              default:
                throw new Error(
                  `Unknown scale ${scaleKey} for ${filenameWithScale}`
                );
            }
          } else {
            // everything else is going to RAW
            destination = 'raw';
          }

          destination = path.join(destination, resourceNormalizedFilename);
        } else {
          const name = `${resourceFilename}${
            scaleKey === '@1x' ? '' : scaleKey
          }.${resourceExtensionType}`;
          destination = path.join(
            options.remote?.enabled ? remoteAssetsDirname : '',
            assetsDirname,
            resourceDirname,
            name
          );
        }

        return {
          filename: destination,
          content,
          scaleKey,
          scale: getScaleNumber(scaleKey),
        };
      })
    );

    logger.debug(
      `Resolved request ${this.resourcePath}`,
      JSON.stringify({
        platform: options.platform,
        rootContext,
        resourceNormalizedFilename,
        resourceFilename,
        resourceDirname,
        resourceAbsoluteDirname,
        resourceExtensionType,
        scales,
        assets: assets.map((asset) => ({
          ...asset,
          content: `size=${asset.content?.length} type=${typeof asset.content}`,
        })),
      })
    );

    let result;
    if (options.inline) {
      logger.debug(`Inlining assets for request ${resourcePath}`);
      result = inlineAssets({
        assets,
        resourcePath,
        resourceFilename,
        suffixPattern,
      });
    } else {
      for (const asset of assets) {
        const { filename, content } = asset;
        logger.debug(`Emitting asset ${filename} for request ${resourcePath}`);

        // Assets are emitted relatively to `output.path`.
        this.emitFile(filename, content ?? '');
      }

      if (options.remote?.enabled) {
        result = convertToRemoteAssets({
          assets,
          assetsDirname,
          remotePublicPath: options.remote.publicPath,
          resourceDirname,
          resourceExtensionType,
          resourceFilename,
          resourcePath,
          suffixPattern,
          pathSeparatorRegexp,
        });
      } else {
        result = await extractAssets(
          {
            resourcePath,
            resourceDirname,
            resourceFilename,
            resourceExtensionType,
            assets,
            suffixPattern,
            assetsDirname,
            pathSeparatorRegexp,
            publicPath: options.publicPath,
            devServerEnabled: options.devServerEnabled,
          },
          logger
        );
      }
    }
    callback?.(null, result);
    // console.timeEnd(`repackAssetsLoader - ${id}`);
  } catch (error) {
    callback?.(error as Error);
  }
}
