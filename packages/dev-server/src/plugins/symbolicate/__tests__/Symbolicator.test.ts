import type { FastifyBaseLogger } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { logSymbolicatedStackFrame } from '../logSymbolicatedStackFrame.js';
import { Symbolicator } from '../Symbolicator.js';
import type {
  ReactNativeStackFrame,
  SymbolicatorDelegate,
  SymbolicatorResults,
} from '../types.js';

const logger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
} as unknown as FastifyBaseLogger;

function createSourceMap(source: string, content: string) {
  return JSON.stringify({
    version: 3,
    sources: [source],
    sourcesContent: [content],
    names: [],
    mappings: 'AAAA',
  });
}

function createDelegate(
  getSourceMap: SymbolicatorDelegate['getSourceMap']
): SymbolicatorDelegate {
  return {
    getSourceMap,
    getSource: vi.fn(async () => {
      throw new Error('Source is not available from the host compiler');
    }),
    shouldIncludeFrame: () => true,
  };
}

describe('Symbolicator', () => {
  it('symbolicates remaining frames when one source map is unavailable', async () => {
    const remoteUrl = 'http://localhost:8082/remote.chunk.bundle';
    const stack: ReactNativeStackFrame[] = [
      {
        file: 'http://localhost:8082/missing.chunk.bundle',
        lineNumber: 1,
        column: 1,
        methodName: 'missing',
      },
      {
        file: remoteUrl,
        lineNumber: 1,
        column: 1,
        methodName: 'RemoteScreen',
      },
    ];
    const symbolicator = new Symbolicator(
      createDelegate(async (url) => {
        if (url !== remoteUrl) {
          throw new Error('Source map is missing');
        }
        return createSourceMap(
          '[projectRoot]/src/RemoteScreen.tsx',
          "throw new Error('REMOTE ERROR');"
        );
      })
    );

    const result = await symbolicator.process(logger, stack);

    expect(result.stack).toHaveLength(2);
    expect(result.stack[0]?.file).toBe(stack[0]?.file);
    expect(result.stack[1]).toMatchObject({
      file: '[projectRoot]/src/RemoteScreen.tsx',
      lineNumber: 1,
      column: 0,
    });
    expect(result.codeFrame?.content).toContain('REMOTE ERROR');
  });

  it('normalizes malformed webpack ignored-module source URLs', async () => {
    const symbolicator = new Symbolicator(
      createDelegate(async () =>
        createSourceMap('webpack://ignored|/buffer', 'module.exports = {};')
      )
    );

    const result = await symbolicator.process(logger, [
      {
        file: 'http://localhost:8082/ignored.chunk.bundle',
        lineNumber: 1,
        column: 1,
        methodName: 'ignored',
      },
    ]);

    expect(result.stack[0]?.file).toBe('webpack://ignored/buffer');
  });

  it('keeps valid application mappings when another webpack source URL is invalid', async () => {
    const symbolicator = new Symbolicator(
      createDelegate(async () =>
        JSON.stringify({
          version: 3,
          sources: [
            'webpack://=="undefined"};generated federation runtime',
            '[projectRoot]/src/App.tsx',
          ],
          sourcesContent: ['generated runtime', 'const app = 1;'],
          names: [],
          mappings: 'ACAA',
        })
      )
    );

    const result = await symbolicator.process(logger, [
      {
        file: 'http://localhost:8081/index.bundle?platform=ios',
        lineNumber: 1,
        column: 0,
        methodName: 'App',
      },
    ]);

    expect(result.stack[0]).toMatchObject({
      file: '[projectRoot]/src/App.tsx',
      lineNumber: 1,
      column: 0,
    });
  });

  it('supports generated and original column zero', async () => {
    const symbolicator = new Symbolicator(
      createDelegate(async () =>
        createSourceMap('[projectRoot]/src/App.tsx', 'const app = 1;')
      )
    );

    const result = await symbolicator.process(logger, [
      {
        file: 'http://localhost:8082/zero.chunk.bundle',
        lineNumber: 1,
        column: 0,
        methodName: 'App',
      },
    ]);

    expect(result.stack[0]).toMatchObject({
      file: '[projectRoot]/src/App.tsx',
      lineNumber: 1,
      column: 0,
    });
  });
});

describe('logSymbolicatedStackFrame', () => {
  const results: SymbolicatorResults = {
    stack: [
      {
        file: '[projectRoot]/src/RemoteScreen.tsx',
        lineNumber: 42,
        column: 18,
        methodName: 'RemoteScreen',
        collapse: false,
      },
    ],
    codeFrame: null,
  };

  it('logs the first useful frame for a runtime error', () => {
    const info = vi.fn();
    const runtimeLogger = { info } as unknown as FastifyBaseLogger;

    logSymbolicatedStackFrame(
      runtimeLogger,
      [
        {
          file: 'http://localhost:8082/remote.chunk.bundle',
          lineNumber: 100,
          column: 20,
          methodName: 'RemoteScreen',
        },
        {
          file: 'http://localhost:8081/index.bundle?platform=ios',
          lineNumber: 200,
          column: 30,
          methodName: 'renderWithHooks',
        },
      ],
      results
    );

    expect(info).toHaveBeenCalledWith({
      msg: 'Symbolicated stack frame: src/RemoteScreen.tsx:42:18',
      methodName: 'RemoteScreen',
    });
  });

  it('does not log component-stack-only symbolication', () => {
    const info = vi.fn();
    const runtimeLogger = { info } as unknown as FastifyBaseLogger;

    logSymbolicatedStackFrame(
      runtimeLogger,
      [
        {
          file: 'http://localhost:8082/remote.chunk.bundle',
          lineNumber: 100,
          column: 20,
          methodName: 'RemoteScreen',
        },
      ],
      results
    );

    expect(info).not.toHaveBeenCalled();
  });

  it('does not report a generated bundle frame as symbolicated', () => {
    const info = vi.fn();
    const runtimeLogger = { info } as unknown as FastifyBaseLogger;

    logSymbolicatedStackFrame(
      runtimeLogger,
      [
        {
          file: 'http://localhost:8081/index.bundle?platform=ios',
          lineNumber: 100,
          column: 20,
          methodName: 'renderWithHooks',
        },
      ],
      {
        stack: [
          {
            file: 'http://localhost:8081/index.bundle?platform=ios',
            lineNumber: 100,
            column: 20,
            methodName: 'App',
            collapse: false,
          },
        ],
        codeFrame: null,
      }
    );

    expect(info).not.toHaveBeenCalled();
  });
});
