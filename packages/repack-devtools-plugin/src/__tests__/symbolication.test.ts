import { describe, expect, it } from 'vitest';
import {
  getSourceMapUrl,
  inferPlatform,
  parseStack,
  symbolicateStack,
} from '../react-native/symbolication';

const BUNDLE = 'http://10.0.2.2:8081/index.bundle?platform=android&dev=true';

const HERMES_STACK = `Error: boom
    at onPress (${BUNDLE}:120:15)
    at apply (native)
    at anonymous (address at ${BUNDLE}:1:2048)
    at http://10.0.2.2:8081/android/src_Async_tsx.chunk.bundle:5:7`;

const response = (status: number, body: unknown) =>
  Promise.resolve({
    status,
    ok: status < 400,
    text: () =>
      Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });

describe('parseStack', () => {
  it('parses Hermes frames and skips native ones', () => {
    expect(parseStack(HERMES_STACK)).toEqual([
      { methodName: 'onPress', file: BUNDLE, lineNumber: 120, column: 15 },
      { methodName: 'apply' },
      { methodName: 'anonymous', file: BUNDLE, lineNumber: 1, column: 2048 },
      {
        methodName: '<unknown>',
        file: 'http://10.0.2.2:8081/android/src_Async_tsx.chunk.bundle',
        lineNumber: 5,
        column: 7,
      },
    ]);
  });

  it('parses JSC frames', () => {
    expect(parseStack(`render@${BUNDLE}:10:3`)).toEqual([
      { methodName: 'render', file: BUNDLE, lineNumber: 10, column: 3 },
    ]);
  });
});

describe('inferPlatform', () => {
  it('reads the platform query or the bundle file name', () => {
    expect(inferPlatform(parseStack(HERMES_STACK))).toBe('android');
    expect(
      inferPlatform([
        { methodName: 'x', file: 'http://localhost:8081/main.ios.bundle' },
      ])
    ).toBe('ios');
  });

  it('returns undefined for stacks without bundle frames', () => {
    expect(
      inferPlatform([{ methodName: 'x', file: 'InternalBytecode.js' }])
    ).toBeUndefined();
  });
});

describe('getSourceMapUrl', () => {
  it('keeps the query after the .map suffix', () => {
    expect(getSourceMapUrl(BUNDLE)).toBe(
      'http://10.0.2.2:8081/index.bundle.map?platform=android&dev=true'
    );
  });
});

describe('symbolicateStack', () => {
  it('maps frames and flags the ones still pointing at a bundle', async () => {
    const calls: string[] = [];
    const posted: unknown[] = [];
    const result = await symbolicateStack(HERMES_STACK, {
      devServer: 'http://10.0.2.2:8081',
      fetch: (url, init) => {
        calls.push(`${init?.method} ${url}`);
        if (init?.body) posted.push(JSON.parse(init.body));
        if (url.endsWith('/symbolicate')) {
          return response(200, {
            stack: [
              {
                methodName: 'onPress',
                file: '/app/src/App.tsx',
                lineNumber: 12,
                column: 4,
              },
              {
                methodName: 'anonymous',
                file: BUNDLE,
                lineNumber: 1,
                column: 2048,
              },
              {
                methodName: '<unknown>',
                file: '/app/src/Async.tsx',
                lineNumber: 3,
                column: 1,
              },
            ],
            codeFrame: {
              content: '\u001b[31m> 12 |\u001b[39m throw new Error()',
            },
          });
        }
        return response(404, 'Not found');
      },
    });

    expect(result.status).toBe(200);
    // The native `apply` frame is not posted; Re.Pack would drop it and
    // shift every following result by one.
    const parsed = parseStack(HERMES_STACK);
    expect(posted).toEqual([{ stack: [parsed[0], parsed[2], parsed[3]] }]);
    expect(result.frames[1].symbolicated).toBeUndefined();
    expect(result.frames[3].symbolicated?.file).toBe('/app/src/Async.tsx');
    expect(result.codeFrame?.content).toBe('> 12 | throw new Error()');
    expect(result.frames.map((frame) => frame.unmapped)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(calls).toEqual([
      'POST http://10.0.2.2:8081/symbolicate',
      'HEAD http://10.0.2.2:8081/index.bundle.map?platform=android&dev=true',
    ]);
    expect(result.sourceMaps).toEqual([
      {
        bundleUrl: BUNDLE,
        sourceMapUrl:
          'http://10.0.2.2:8081/index.bundle.map?platform=android&dev=true',
        status: 404,
      },
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: `1 frame(s) in ${BUNDLE} were not symbolicated.`,
        hint: expect.stringContaining('returned 404'),
      }),
    ]);
  });

  it('explains a 400 caused by a stack without a platform', async () => {
    const result = await symbolicateStack(
      'at apply (native)\n    at f (InternalBytecode.js:1:2)',
      {
        devServer: 'http://localhost:8081',
        fetch: () => response(400, 'Cannot infer platform from stack trace'),
      }
    );
    expect(result.status).toBe(400);
    expect(result.diagnostics.map((item) => item.message)).toEqual([
      expect.stringContaining('Cannot infer platform'),
      expect.stringContaining('/symbolicate responded with 400'),
    ]);
  });

  it('reports an unknown dev server without calling fetch', async () => {
    const result = await symbolicateStack(HERMES_STACK, {
      fetch: () => {
        throw new Error('should not be called');
      },
    });
    expect(result.diagnostics.at(-1)?.message).toContain(
      'Dev server origin is unknown'
    );
  });
});
