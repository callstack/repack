import { URL } from 'node:url';

interface StackFrameLike {
  file: string | null;
}

export function normalizeInvalidWebpackSourceUrls(
  rawSourceMap: string | Buffer
) {
  const sourceMapText = rawSourceMap.toString();
  if (!sourceMapText.includes('webpack://')) {
    return sourceMapText;
  }

  const sourceMap = JSON.parse(sourceMapText) as {
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
          return normalizedSource;
        }

        try {
          new URL(normalizedSource);
          return normalizedSource;
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
  return JSON.stringify(sourceMap);
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
