import type { Compiler } from '@rspack/core';
import { LoggerPlugin } from '../LoggerPlugin.js';

const compilerMock = {
  options: {},
  hooks: {
    infrastructureLog: { tap: jest.fn() },
    thisCompilation: { tap: jest.fn() },
    afterDone: { tap: jest.fn() },
  },
};

describe('LoggerPlugin', () => {
  let exceptionListeners: NodeJS.UncaughtExceptionListener[];
  let exitListeners: NodeJS.ExitListener[];

  beforeEach(() => {
    exceptionListeners = process.listeners('uncaughtException');
    exitListeners = process.listeners('exit');
  });

  afterEach(() => {
    for (const listener of process.listeners('uncaughtException')) {
      if (!exceptionListeners.includes(listener)) {
        process.off('uncaughtException', listener);
      }
    }
    for (const listener of process.listeners('exit')) {
      if (!exitListeners.includes(listener)) {
        process.off('exit', listener);
      }
    }
    process.exitCode = undefined;
  });

  it('sets a failing exit code on uncaught exceptions', () => {
    const plugin = new LoggerPlugin({ output: {} });
    plugin.apply(compilerMock as unknown as Compiler);

    const listener = process
      .listeners('uncaughtException')
      .find((l) => !exceptionListeners.includes(l));

    expect(listener).toBeDefined();
    listener?.(new Error('boom'), 'uncaughtException');

    expect(process.exitCode).toBe(1);
  });
});
