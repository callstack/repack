import path from 'path';
import mimeTypes from 'mime-types';

const dataUriRegexp = /^data:([^;,]+)?((?:;[^;,]+)*?)(?:;(base64))?,(.*)$/i;

export function inlineAsset(content: string | Buffer, resourcePath: string) {
  return `module.exports = ${JSON.stringify({
    uri: getEncodedAsset(content, resourcePath),
  })}`;
}

const decodeDataUriContent = (encoding: string, content: string) => {
  const isBase64 = encoding === 'base64';
  return isBase64
    ? Buffer.from(content, 'base64')
    : Buffer.from(decodeURIComponent(content), 'ascii');
};

function getEncodedAsset(content: string | Buffer, resourcePath: string) {
  const extension = path.extname(resourcePath);
  let [
    ,
    mimeType = '',
    parameters = '',
    encoding = false,
    encodedContent = '',
  ] = dataUriRegexp.exec(resourcePath) ?? [];

  let finalMimeType: string | boolean | undefined;
  if (mimeType) {
    finalMimeType = mimeType + parameters;
  } else if (extension) {
    finalMimeType = mimeTypes.lookup(extension);
  }

  if (typeof finalMimeType !== 'string' || !finalMimeType) {
    throw new Error(
      `Cannot inline asset ${resourcePath} - unable to detect mime type`
    );
  }

  let finalEncodedContent: string;
  if (
    encoding === 'base64' &&
    decodeDataUriContent(encoding, encodedContent).equals(
      content instanceof Buffer
        ? content
        : decodeDataUriContent(encoding, content)
    )
  ) {
    finalEncodedContent = encodedContent;
  } else {
    finalEncodedContent =
      content instanceof Buffer ? content.toString('base64') : content;
  }

  return `data:${finalMimeType};base64,${finalEncodedContent}`;
}
