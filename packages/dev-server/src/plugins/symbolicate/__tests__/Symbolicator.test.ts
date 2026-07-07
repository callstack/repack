import type { FastifyBaseLogger } from 'fastify';
import { SourceMapGenerator } from 'source-map';
import { describe, expect, it, vi } from 'vitest';
import { Symbolicator, sanitizeRawSourceMap } from '../Symbolicator.js';
import type { ReactNativeStackFrame } from '../types.js';

const HOST_BUNDLE = 'http://localhost:8081/index.bundle?platform=ios';
const REMOTE_BUNDLE = 'http://localhost:8082/ios/MiniApp.chunk.bundle';
const APP_SOURCE = '[projectRoot]/src/App.tsx';

// A source name that is not URL-parseable, mirroring the corrupt
// `webpack://` source name Module Federation v2 emits into host maps.
const CORRUPT_SOURCE = 'webpack://{"raw runtime code"}/';

function createLogger(): FastifyBaseLogger {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    silent: vi.fn(),
    level: 'debug',
    child: () => logger,
  };
  return logger as unknown as FastifyBaseLogger;
}

function createSourceMap({
  ignoreListField,
  extraSources = [],
}: {
  ignoreListField?: 'ignoreList' | 'x_google_ignoreList';
  extraSources?: string[];
} = {}): string {
  const generator = new SourceMapGenerator({ file: 'index.bundle' });
  generator.addMapping({
    generated: { line: 1, column: 10 },
    original: { line: 5, column: 3 },
    source: APP_SOURCE,
    name: 'render',
  });
  // A mapping at generated column 0 — a valid position that falsy checks
  // would incorrectly treat as missing.
  generator.addMapping({
    generated: { line: 2, column: 0 },
    original: { line: 7, column: 0 },
    source: APP_SOURCE,
  });

  const map = JSON.parse(generator.toString());
  map.sources.push(...extraSources);
  if (ignoreListField) {
    map[ignoreListField] = [0];
  }
  return JSON.stringify(map);
}

function createSymbolicator(sourceMaps: Record<string, string | Error>) {
  const getSourceMap = vi.fn(async (fileUrl: string) => {
    const entry = sourceMaps[fileUrl];
    if (entry === undefined) {
      throw new Error(`Source map for ${fileUrl} is missing`);
    }
    if (entry instanceof Error) {
      throw entry;
    }
    return entry;
  });
  const getSource = vi.fn(async (fileUrl: string) => `source of ${fileUrl}`);
  const symbolicator = new Symbolicator({
    getSource,
    getSourceMap,
    shouldIncludeFrame: () => true,
  });
  return { symbolicator, getSourceMap, getSource };
}

function frame(
  file: string | null,
  lineNumber: number | null = 1,
  column: number | null = 10,
  methodName = 'anonymous'
): ReactNativeStackFrame {
  return { file, lineNumber, column, methodName };
}

describe('sanitizeRawSourceMap', () => {
  it('replaces source names that are not URL-parseable', () => {
    const raw = createSourceMap({ extraSources: [CORRUPT_SOURCE] });
    const { sourceMap } = sanitizeRawSourceMap(raw);
    const parsed = JSON.parse(sourceMap);

    expect(parsed.sources).toContain(APP_SOURCE);
    expect(parsed.sources).not.toContain(CORRUPT_SOURCE);
    expect(parsed.sources).toContain('unparseable-source-1');
  });

  it.each(['ignoreList', 'x_google_ignoreList'] as const)(
    'collects ignored sources from %s',
    (field) => {
      const raw = createSourceMap({ ignoreListField: field });
      const { ignoredSources } = sanitizeRawSourceMap(raw);
      expect(ignoredSources).toEqual(new Set([APP_SOURCE]));
    }
  );
});

describe('Symbolicator', () => {
  it('symbolicates frames from bundles with a source map', async () => {
    const { symbolicator } = createSymbolicator({
      [HOST_BUNDLE]: createSourceMap(),
    });

    const results = await symbolicator.process(createLogger(), [
      frame(HOST_BUNDLE, 1, 10),
    ]);

    expect(results.stack).toEqual([
      {
        file: APP_SOURCE,
        lineNumber: 5,
        column: 3,
        methodName: 'render',
        collapse: false,
      },
    ]);
  });

  it('symbolicates frames at generated column 0', async () => {
    const { symbolicator } = createSymbolicator({
      [HOST_BUNDLE]: createSourceMap(),
    });

    const results = await symbolicator.process(createLogger(), [
      frame(HOST_BUNDLE, 2, 0),
    ]);

    expect(results.stack[0].file).toBe(APP_SOURCE);
    expect(results.stack[0].lineNumber).toBe(7);
  });

  it('survives a corrupt source name in the map', async () => {
    const { symbolicator } = createSymbolicator({
      [HOST_BUNDLE]: createSourceMap({ extraSources: [CORRUPT_SOURCE] }),
    });

    const results = await symbolicator.process(createLogger(), [
      frame(HOST_BUNDLE, 1, 10),
    ]);

    expect(results.stack[0].file).toBe(APP_SOURCE);
  });

  it('returns a failed frame unchanged without failing the request', async () => {
    const logger = createLogger();
    const { symbolicator } = createSymbolicator({
      [HOST_BUNDLE]: createSourceMap(),
    });

    const results = await symbolicator.process(logger, [
      frame(REMOTE_BUNDLE, 3, 7, 'remoteMethod'),
      frame(HOST_BUNDLE, 1, 10),
    ]);

    expect(results.stack).toHaveLength(2);
    expect(results.stack[0]).toEqual({
      file: REMOTE_BUNDLE,
      lineNumber: 3,
      column: 7,
      methodName: 'remoteMethod',
      collapse: false,
    });
    expect(results.stack[1].file).toBe(APP_SOURCE);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('keeps the response stack 1:1 with the request', async () => {
    const { symbolicator } = createSymbolicator({
      [HOST_BUNDLE]: createSourceMap(),
    });

    const results = await symbolicator.process(createLogger(), [
      frame(null),
      frame('[native code]', null, null),
      frame(HOST_BUNDLE, 1, 10),
    ]);

    expect(results.stack).toHaveLength(3);
    expect(results.stack[0].file).toBeNull();
    expect(results.stack[1]).toMatchObject({
      file: '[native code]',
      collapse: true,
    });
    expect(results.stack[2].file).toBe(APP_SOURCE);
  });

  it('collapses frames whose original source is in the ignore list', async () => {
    const { symbolicator } = createSymbolicator({
      [HOST_BUNDLE]: createSourceMap({
        ignoreListField: 'x_google_ignoreList',
      }),
    });

    const results = await symbolicator.process(createLogger(), [
      frame(HOST_BUNDLE, 1, 10),
    ]);

    expect(results.stack[0]).toMatchObject({
      file: APP_SOURCE,
      collapse: true,
    });
  });

  it('never anchors the code frame on a frame that failed to symbolicate', async () => {
    const { symbolicator, getSource } = createSymbolicator({
      [HOST_BUNDLE]: createSourceMap(),
    });

    const results = await symbolicator.process(createLogger(), [
      frame(REMOTE_BUNDLE, 3, 7),
      frame(HOST_BUNDLE, 1, 10),
    ]);

    expect(results.codeFrame?.fileName).toBe(APP_SOURCE);
    expect(getSource).toHaveBeenCalledTimes(1);
    expect(getSource).toHaveBeenCalledWith(APP_SOURCE);
  });

  it('loads the source map once per file within a request', async () => {
    const { symbolicator, getSourceMap } = createSymbolicator({
      [HOST_BUNDLE]: createSourceMap(),
    });

    await symbolicator.process(createLogger(), [
      frame(HOST_BUNDLE, 1, 10),
      frame(HOST_BUNDLE, 2, 0),
      frame(REMOTE_BUNDLE, 1, 1),
      frame(REMOTE_BUNDLE, 2, 2),
    ]);

    // One successful load for the host bundle, one failed attempt for the
    // remote bundle — repeated frames reuse the cached result either way.
    expect(getSourceMap).toHaveBeenCalledTimes(2);
  });
});
