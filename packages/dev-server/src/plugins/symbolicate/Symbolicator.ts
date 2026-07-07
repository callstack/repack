import { URL } from 'node:url';
import { codeFrameColumns } from '@babel/code-frame';
import type { FastifyBaseLogger } from 'fastify';
import { SourceMapConsumer } from 'source-map';
import type {
  CodeFrame,
  InputStackFrame,
  PassthroughStackFrame,
  ReactNativeStackFrame,
  StackFrame,
  SymbolicatorDelegate,
  SymbolicatorResults,
} from './types.js';

/**
 * Frames whose symbolicated source path matches this pattern are marked with
 * `collapse: true`, hiding them by default in LogBox. Mirrors the approach of
 * React Native's default Metro config (`INTERNAL_CALLSITES_REGEX` in
 * `@react-native/metro-config`), which collapses by resolved file path —
 * never by method name, so user code with a coincidental name is unaffected.
 */
const INTERNAL_CALLSITES = new RegExp(
  [
    'node_modules/react-native/Libraries/BatchedBridge/MessageQueue\\.js$',
    'node_modules/react-native/Libraries/Core/.+',
    'node_modules/react-native/Libraries/LogBox/.+',
    'node_modules/react-native/Libraries/Renderer/implementations/.+',
    'node_modules/react-native/Libraries/Utilities/HMRClient\\.js$',
    'node_modules/react/cjs/.+',
    'node_modules/scheduler/.+',
    'node_modules/metro-runtime/.+',
    '^\\[native code\\]$',
  ]
    .map((pattern) => pattern.replaceAll('/', '[/\\\\]'))
    .join('|')
);

interface SourceMapCacheEntry {
  consumer: SourceMapConsumer;
  /** Original sources listed in the map's `ignoreList`/`x_google_ignoreList`. */
  ignoredSources: Set<string>;
}

type ProcessedFrame =
  | { frame: StackFrame; symbolicated: true }
  | { frame: PassthroughStackFrame; symbolicated: false };

/**
 * Replaces source names that are not URL-parseable so `SourceMapConsumer`
 * construction cannot fail on them. Module Federation v2 is known to emit a
 * corrupt `webpack://` source name (containing raw runtime code) into host
 * bundle maps, which makes the consumer throw `Invalid URL` — taking down
 * symbolication of every frame in the bundle. Indices are preserved so
 * mappings stay aligned.
 */
export function sanitizeRawSourceMap(rawSourceMap: string): {
  sourceMap: string;
  ignoredSources: Set<string>;
} {
  const map: { sources?: unknown[]; [key: string]: unknown } =
    JSON.parse(rawSourceMap);

  const sources = Array.isArray(map.sources) ? map.sources : [];
  map.sources = sources.map((source, index) => {
    if (typeof source !== 'string') {
      return `unparseable-source-${index}`;
    }
    try {
      new URL(source, 'file:///');
      return source;
    } catch {
      return `unparseable-source-${index}`;
    }
  });

  const ignoreList = Array.isArray(map.ignoreList)
    ? map.ignoreList
    : Array.isArray(map.x_google_ignoreList)
      ? map.x_google_ignoreList
      : [];
  const ignoredSources = new Set<string>();
  for (const index of ignoreList) {
    const source = typeof index === 'number' ? map.sources[index] : undefined;
    if (typeof source === 'string') {
      ignoredSources.add(source);
    }
  }

  return { sourceMap: JSON.stringify(map), ignoredSources };
}

/**
 * Class for transforming stack traces from React Native application with using Source Map.
 * Raw stack frames produced by React Native, points to some location from the bundle
 * eg `index.bundle?platform=ios:567:1234`. By using Source Map for that bundle `Symbolicator`
 * produces frames that point to source code inside your project eg `Hello.tsx:10:9`.
 */
export class Symbolicator {
  /**
   * Infer platform from stack frames.
   * Usually at least one frame has `file` field with the bundle URL eg:
   * `http://localhost:8081/index.bundle?platform=ios&...`, which can be used to infer platform.
   *
   * @param stack Array of stack frames.
   * @returns Inferred platform or `undefined` if cannot infer.
   */
  static inferPlatformFromStack(stack: ReactNativeStackFrame[]) {
    for (const frame of stack) {
      if (!frame.file) {
        continue;
      }

      const { searchParams, pathname } = new URL(frame.file, 'file://');
      const platform = searchParams.get('platform');
      if (platform) {
        return platform;
      }
      const [bundleFilename] = pathname.split('/').reverse();
      const [, platformOrExtension, extension] = bundleFilename.split('.');
      if (extension) {
        return platformOrExtension;
      }
    }
  }

  /**
   * Cache with initialized `SourceMapConsumer` to improve symbolication performance.
   */
  sourceMapConsumerCache: Record<string, SourceMapCacheEntry> = {};

  /**
   * Files whose source map failed to load during the current `process` call,
   * so repeated frames from the same file don't repeat the failing lookup.
   */
  private failedSourceMapFiles = new Set<string>();

  /**
   * Constructs new `Symbolicator` instance.
   *
   * @param delegate Delegate instance with symbolication functions.
   */
  constructor(private delegate: SymbolicatorDelegate) {}

  /**
   * Process raw React Native stack frames and transform them using Source Maps.
   * Method will try to symbolicate as much data as possible, but if the Source Maps
   * are not available, invalid or the original positions/data is not found in Source Maps,
   * the method will return raw values - the same as supplied with `stack` parameter.
   * For example out of 10 frames, it's possible that only first 7 will be symbolicated and the
   * remaining 3 will be unchanged.
   *
   * A failure to symbolicate one frame (e.g. a Module Federation remote chunk
   * whose source map is unavailable) never fails the whole request — the
   * failed frame passes through unchanged, mirroring Metro's behavior.
   *
   * @param logger Fastify logger instance.
   * @param stack Raw stack frames.
   * @returns Symbolicated stack frames.
   */
  async process(
    logger: FastifyBaseLogger,
    stack: ReactNativeStackFrame[]
  ): Promise<SymbolicatorResults> {
    try {
      logger.debug({ msg: 'Processing frames', frames: stack });

      const processedFrames: ProcessedFrame[] = [];
      for (const frame of stack) {
        if (!frame.file) {
          // Keep the response 1:1 with the request — LogBox rejects
          // symbolication results with a different number of frames.
          processedFrames.push({
            frame: { ...frame, collapse: false },
            symbolicated: false,
          });
          continue;
        }
        const inputFrame: InputStackFrame = { ...frame, file: frame.file };
        processedFrames.push(await this.processFrameSafe(logger, inputFrame));
      }

      const codeFrame =
        (await this.getCodeFrame(logger, processedFrames)) ?? null;

      logger.debug({
        msg: 'Finished symbolicating frames',
        processedFrames,
        codeFrame,
      });

      return {
        stack: processedFrames.map(({ frame }) => frame),
        codeFrame,
      };
    } finally {
      this.failedSourceMapFiles.clear();
      for (const key in this.sourceMapConsumerCache) {
        this.sourceMapConsumerCache[key].consumer.destroy();
        delete this.sourceMapConsumerCache[key];
      }
    }
  }

  /**
   * Only frames that plausibly come from a served bundle get a source-map
   * lookup; everything else (native frames, unrelated files) passes through.
   */
  private shouldAttemptSymbolication(frame: InputStackFrame): boolean {
    if (frame.lineNumber == null || frame.column == null) {
      return false;
    }
    return (
      frame.file.startsWith('http') ||
      frame.file.includes('.bundle') ||
      frame.file.includes('.hot-update.js')
    );
  }

  private async processFrameSafe(
    logger: FastifyBaseLogger,
    frame: InputStackFrame
  ): Promise<ProcessedFrame> {
    const passthrough: ProcessedFrame = {
      frame: { ...frame, collapse: INTERNAL_CALLSITES.test(frame.file) },
      symbolicated: false,
    };

    if (
      !this.shouldAttemptSymbolication(frame) ||
      this.failedSourceMapFiles.has(frame.file)
    ) {
      return passthrough;
    }

    try {
      if (!this.sourceMapConsumerCache[frame.file]) {
        logger.debug({
          msg: 'Loading raw source map data',
          fileUrl: frame.file,
        });
        const rawSourceMap = await this.delegate.getSourceMap(frame.file);

        const { sourceMap, ignoredSources } = sanitizeRawSourceMap(
          rawSourceMap.toString()
        );
        const consumer = await new SourceMapConsumer(sourceMap);
        this.sourceMapConsumerCache[frame.file] = { consumer, ignoredSources };
      }

      return this.processFrame(frame);
    } catch (error) {
      this.failedSourceMapFiles.add(frame.file);
      logger.warn({
        msg: `Failed to symbolicate ${frame.file} — returning the frame unsymbolicated`,
        error: error instanceof Error ? error.message : String(error),
      });
      return passthrough;
    }
  }

  private processFrame(frame: InputStackFrame): ProcessedFrame {
    const entry = this.sourceMapConsumerCache[frame.file];
    if (entry == null || frame.lineNumber == null || frame.column == null) {
      return {
        frame: { ...frame, collapse: false },
        symbolicated: false,
      };
    }

    const { consumer, ignoredSources } = entry;
    let lookup = consumer.originalPositionFor({
      line: frame.lineNumber,
      column: frame.column,
      bias: SourceMapConsumer.LEAST_UPPER_BOUND,
    });

    if (!lookup.source) {
      // fallback to GREATEST_LOWER_BOUND
      lookup = consumer.originalPositionFor({
        line: frame.lineNumber,
        column: frame.column,
        bias: SourceMapConsumer.GREATEST_LOWER_BOUND,
      });
    }

    // return the original frame when both lookups fail
    if (!lookup.source) {
      return {
        frame: { ...frame, collapse: false },
        symbolicated: false,
      };
    }

    return {
      frame: {
        lineNumber: lookup.line ?? frame.lineNumber,
        column: lookup.column ?? frame.column,
        file: lookup.source,
        methodName: lookup.name ?? frame.methodName,
        collapse:
          ignoredSources.has(lookup.source) ||
          INTERNAL_CALLSITES.test(lookup.source),
      },
      symbolicated: true,
    };
  }

  private async getCodeFrame(
    logger: FastifyBaseLogger,
    processedFrames: ProcessedFrame[]
  ): Promise<CodeFrame | undefined> {
    for (const { frame, symbolicated } of processedFrames) {
      // Only frames resolved to an original source can anchor the code
      // frame — rendering a raw bundle at generated coordinates produces
      // a garbage snippet.
      if (
        !symbolicated ||
        frame.collapse ||
        frame.lineNumber == null ||
        frame.column == null
      ) {
        continue;
      }

      if (!this.delegate.shouldIncludeFrame(frame)) {
        return undefined;
      }

      logger.debug({
        msg: 'Generating code frame',
        frame,
      });

      try {
        return {
          content: codeFrameColumns(
            (await this.delegate.getSource(frame.file)).toString(),
            {
              start: { column: frame.column, line: frame.lineNumber },
            },
            { forceColor: true }
          ),
          location: {
            row: frame.lineNumber,
            column: frame.column,
          },
          fileName: frame.file,
        };
      } catch (error) {
        logger.error({
          msg: 'Failed to create code frame',
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return undefined;
    }
  }
}
