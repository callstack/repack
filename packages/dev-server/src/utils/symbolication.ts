import { URL } from 'node:url';
import type { RawIndexMap, RawSourceMap } from 'source-map';

interface StackFrameLike {
  file: string | null;
}

// `source-map` normalises every source name through `new URL()`, which
// percent-encodes characters such as spaces, non-ASCII letters and the caret
// in `[projectRoot^N]`. Escaping `%` before the consumer reads the map makes
// `decodeSourceName` an exact inverse, so a file name that contains `%` keeps
// it instead of being decoded a second time.
export function escapeSourceName(source: string) {
  return source.replaceAll('%', '%25');
}

export function decodeSourceName(source: string) {
  return decodeURIComponent(source);
}

/**
 * Prepare a raw source map for `SourceMapConsumer`: replace webpack source
 * URLs that would make it reject the map and escape every source name, so
 * names returned by the consumer can be restored with `decodeSourceName`.
 */
export function prepareSourceMap(
  rawSourceMap: string | Buffer
): RawSourceMap | RawIndexMap {
  const sourceMap = JSON.parse(rawSourceMap.toString()) as {
    sources?: unknown[];
    sections?: Array<{ map?: unknown }>;
  };

  let invalidSourceIndex = 0;
  const normalize = (map: unknown) => {
    if (!map || typeof map !== 'object') {
      return;
    }

    const current = map as {
      sources?: unknown[];
      sections?: Array<{ map?: unknown }>;
    };
    if (Array.isArray(current.sources)) {
      current.sources = current.sources.map((source) => {
        if (typeof source !== 'string') {
          return source;
        }

        const normalizedSource = source.replace(
          /^webpack:\/\/([^/|]+)\|\/?/,
          'webpack://$1/'
        );
        if (!normalizedSource.startsWith('webpack://')) {
          return escapeSourceName(normalizedSource);
        }

        try {
          new URL(normalizedSource);
          return escapeSourceName(normalizedSource);
        } catch {
          // Some generated Module Federation runtime modules use their source
          // text as a webpack URL. A single invalid URL makes source-map reject
          // the complete map, including otherwise valid application sources.
          return `webpack://invalid-source/${invalidSourceIndex++}`;
        }
      });
    }
    for (const section of current.sections ?? []) {
      normalize(section.map);
    }
  };

  normalize(sourceMap);
  // SourceMapConsumer accepts parsed maps. Returning the object avoids
  // serializing it here only for the consumer to parse it again.
  return sourceMap as RawSourceMap | RawIndexMap;
}

export function isGeneratedBundleFrame(frame: StackFrameLike) {
  return Boolean(
    frame.file &&
      (frame.file.includes('.bundle') || frame.file.includes('.hot-update.js'))
  );
}

export function isSymbolicatableFrame<T extends StackFrameLike>(
  frame: T
): frame is T & { file: string } {
  return Boolean(
    frame.file &&
      (frame.file.startsWith('http') || isGeneratedBundleFrame(frame))
  );
}
