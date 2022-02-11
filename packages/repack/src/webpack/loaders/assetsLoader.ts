import path from 'path';
import utils, { LoaderContext } from 'loader-utils';
import { validate as validateSchema } from 'schema-utils';
import { imageSize } from 'image-size';
import dedent from 'dedent';
import hasha from 'hasha';
import mimeTypes from 'mime-types';
import escapeStringRegexp from 'escape-string-regexp';
import { ISizeCalculationResult } from 'image-size/dist/types/interface';
import { AssetResolver } from '../plugins/AssetsResolverPlugin/AssetResolver';

const URIRegEx = /^data:([^;,]+)?((?:;[^;,]+)*?)(?:;(base64))?,(.*)$/i;

interface Options {
  platform: string;
  scalableAssetExtensions: string[];
  devServerEnabled?: boolean;
  inline?: boolean;
  publicPath?: string;
}

function getOptions(loaderContext: LoaderContext): Options {
  const options = utils.getOptions(loaderContext) || {};

  validateSchema(
    {
      type: 'object',
      required: ['platform', 'scalableAssetExtensions'],
      properties: {
        platform: {
          type: 'string',
        },
        scalableAssetExtensions: {
          type: 'array',
        },
        inline: { type: 'boolean' },
        devServerEnabled: { type: 'boolean' },
        publicPath: { type: 'string' },
      },
    },
    options,
    { name: 'reactNativeAssetsLoader' }
  );

  return options as unknown as Options;
}

export const raw = true;

export default async function reactNativeAssetsLoader(this: LoaderContext) {
  this.cacheable();

  const callback = this.async();
  const logger = this.getLogger('reactNativeAssetsLoader');
  const rootContext = this.rootContext;

  logger.debug('Processing:', this.resourcePath);

  try {
    const options = getOptions(this);
    const pathSeparatorPattern = new RegExp(`\\${path.sep}`, 'g');
    const resourcePath = this.resourcePath;
    const dirname = path.dirname(resourcePath);
    // Relative path to rootContext without any ../ due to https://github.com/callstack/haul/issues/474
    // Assets from from outside of rootContext, should still be placed inside bundle output directory.
    // Example:
    //   resourcePath    = monorepo/node_modules/my-module/image.png
    //   dirname         = monorepo/node_modules/my-module
    //   rootContext     = monorepo/packages/my-app/
    //   relativeDirname = ../../node_modules/my-module (original)
    // So when we calculate destination for the asset for iOS ('assets' + relativeDirname + filename),
    // it will end up outside of `assets` directory, so we have to make sure it's:
    //   relativeDirname = node_modules/my-module (tweaked)
    const relativeDirname = path
      .relative(rootContext, dirname)
      .replace(new RegExp(`^[\\.\\${path.sep}]+`), '');
    const type = path.extname(resourcePath).replace(/^\./, '');
    const assetsPath = 'assets';
    const suffix = `(@\\d+(\\.\\d+)?x)?(\\.(${options.platform}|native))?\\.${type}$`;
    const filename = path
      .basename(resourcePath)
      .replace(new RegExp(suffix), '');
    // Name with embedded relative dirname eg `node_modules_reactnative_libraries_newappscreen_components_logo.png`
    const normalizedName = `${(relativeDirname.length === 0
      ? filename
      : `${relativeDirname.replace(pathSeparatorPattern, '_')}_${filename}`
    )
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')}.${type}`;

    const files = await new Promise<string[]>((resolve, reject) =>
      this.fs.readdir(dirname, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(
            (results as Array<any> | undefined)?.filter(
              (result) => typeof result === 'string'
            ) ?? []
          );
        }
      })
    );
    const scales = AssetResolver.collectScales(
      options.scalableAssetExtensions,
      files,
      {
        name: filename,
        type,
        platform: options.platform,
      }
    );

    const scaleKeys = Object.keys(scales).sort(
      (a, b) =>
        parseFloat(a.replace(/[^\d.]/g, '')) -
        parseFloat(b.replace(/[^\d.]/g, ''))
    );

    const scaleNumbers = scaleKeys.map((scale) =>
      parseFloat(scale.replace(/[^\d.]/g, ''))
    );
    const assets = await Promise.all(
      scaleKeys.map(
        (
          scale
        ): Promise<{
          destination: string;
          content: string | Buffer | undefined;
        }> => {
          const scaleFilePath = path.join(dirname, scales[scale].name);
          this.addDependency(scaleFilePath);

          return new Promise((resolve, reject) =>
            this.fs.readFile(scaleFilePath, (error, results) => {
              if (error) {
                reject(error);
              } else {
                let destination;

                if (
                  !options.devServerEnabled &&
                  options.platform === 'android'
                ) {
                  const testXml = /\.(xml)$/;
                  const testMP4 = /\.(mp4)$/;
                  const testImages = /\.(png|jpg|gif|webp)$/;
                  const testFonts = /\.(ttf|otf|ttc)$/;

                  // found font family
                  if (
                    testXml.test(normalizedName) &&
                    results?.indexOf('font-family') !== -1
                  ) {
                    destination = 'font';
                  } else if (testFonts.test(normalizedName)) {
                    // font extensions
                    destination = 'font';
                  } else if (testMP4.test(normalizedName)) {
                    // video files extensions
                    destination = 'raw';
                  } else if (
                    testImages.test(normalizedName) ||
                    testXml.test(normalizedName)
                  ) {
                    // images extensions
                    switch (scale) {
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
                          `Unknown scale ${scale} for ${scaleFilePath}`
                        );
                    }
                  } else {
                    // everything else is going to RAW
                    destination = 'raw';
                  }

                  destination = path.join(destination, normalizedName);
                } else {
                  const name = `${filename}${
                    scale === '@1x' ? '' : scale
                  }.${type}`;
                  destination = path.join(assetsPath, relativeDirname, name);
                }

                resolve({
                  destination,
                  content: results,
                });
              }
            })
          );
        }
      )
    );

    assets.forEach((asset) => {
      if (options.inline) {
        return;
      }
      const { destination, content } = asset;

      logger.debug('Asset emitted:', destination);
      // Assets are emitted relatively to `output.path`.
      this.emitFile(destination, content ?? '');
    });

    if (options.inline) {
      const { content } = assets[assets.length - 1];
      if (content) {
        callback?.(
          null,
          dedent`
        module.exports = ${JSON.stringify(
          inlineAssetLoader(content, resourcePath)
        )}
      `
        );
      }
      return;
    }

    let publicPath = path
      .join(assetsPath, relativeDirname)
      .replace(pathSeparatorPattern, '/');

    if (options.publicPath) {
      publicPath = path.join(options.publicPath, publicPath);
    }

    const hashes = await Promise.all(
      assets.map((asset) =>
        hasha.async(asset.content?.toString() ?? asset.destination, {
          algorithm: 'md5',
        })
      )
    );

    let info: ISizeCalculationResult | undefined;

    try {
      info = imageSize(this.resourcePath);

      const match = path
        .basename(this.resourcePath)
        .match(new RegExp(`^${escapeStringRegexp(filename)}${suffix}`));

      if (match?.[1]) {
        const scale = Number(match[1].replace(/[^\d.]/g, ''));

        if (typeof scale === 'number' && Number.isFinite(scale)) {
          info.width && (info.width /= scale);
          info.height && (info.height /= scale);
        }
      }
    } catch (e) {
      // Asset is not an image
    }

    logger.debug('Asset processed:', {
      resourcePath,
      platform: options.platform,
      rootContext,
      relativeDirname,
      type,
      assetsPath,
      filename,
      normalizedName,
      scales,
      assets: assets.map((asset) => asset.destination),
      publicPath,
      width: info?.width,
      height: info?.height,
    });

    callback?.(
      null,
      dedent`
      var AssetRegistry = require('react-native/Libraries/Image/AssetRegistry');
      module.exports = AssetRegistry.registerAsset({
        __packager_asset: true,
        scales: ${JSON.stringify(scaleNumbers)},
        name: ${JSON.stringify(filename)},
        type: ${JSON.stringify(type)},
        hash: ${JSON.stringify(hashes.join())},
        httpServerLocation: ${JSON.stringify(publicPath)},
        ${
          options.devServerEnabled
            ? `fileSystemLocation: ${JSON.stringify(dirname)},`
            : ''
        }
        ${info ? `height: ${info.height},` : ''}
        ${info ? `width: ${info.width},` : ''}
      });
      `
    );
  } catch (error) {
    callback?.(error as Error);
  }
}

const decodeDataUriContent = (encoding: string, content: string) => {
  const isBase64 = encoding === 'base64';
  return isBase64
    ? Buffer.from(content, 'base64')
    : Buffer.from(decodeURIComponent(content), 'ascii');
};

function inlineAssetLoader(content: string | Buffer, resource: string) {
  const ext = path.extname(resource);
  const match = URIRegEx.exec(resource);
  let resultMimeType: string | boolean;
  let mimeType: string;
  let parameters: string;
  let encodedContent: string;
  let encoding: boolean | string;
  if (match) {
    mimeType = match[1] || '';
    parameters = match[2] || '';
    encoding = match[3] || false;
    encodedContent = match[4] || '';
  }

  if (mimeType! !== undefined) {
    resultMimeType = mimeType + parameters!;
  } else if (ext) {
    resultMimeType = mimeTypes.lookup(ext);
  }

  if (typeof resultMimeType! !== 'string') {
    throw new Error(
      "DataUrl can't be generated automatically, " +
        `because there is no mimetype for "${ext}" in mimetype database. ` +
        'Either pass a mimetype via "generator.mimetype" or ' +
        'use type: "asset/resource" to create a resource file instead of a DataUrl'
    );
  }

  let finalEncodedContent: string;
  if (
    encoding! === 'base64' &&
    decodeDataUriContent(encoding, encodedContent!).equals(
      content instanceof Buffer
        ? content
        : decodeDataUriContent(encoding, content)
    )
  ) {
    finalEncodedContent = encodedContent!;
  } else {
    finalEncodedContent =
      content instanceof Buffer ? content.toString('base64') : content;
  }

  const encodedSource = `data:${resultMimeType};base64,${finalEncodedContent}`;
  return {
    uri: encodedSource,
  };
}
