import type readline from 'node:readline';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { Logger } from '../../../types.js';
import { setupInteractions } from '../setupInteractions.js';

type Colorette = typeof import('colorette');
// eliminate ANSI colors formatting for proper assertions
vi.mock('colorette', async () => {
  const colorette = await vi.importActual<Colorette>('colorette');
  return colorette.createColors({ useColor: false });
});

describe('setupInteractions', () => {
  let mockLogger: Logger;
  let mockProcess: NodeJS.Process;
  let mockReadline: typeof readline;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    mockProcess = {
      stdin: {
        setRawMode: vi.fn(),
        on: vi.fn(),
      },
      stdout: {
        write: vi.fn(),
      },
      exit: vi.fn(),
      emit: vi.fn(),
    } as unknown as NodeJS.Process;

    mockReadline = {
      emitKeypressEvents: vi.fn(),
    } as unknown as typeof readline;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should log a warning if setRawMode is not available', () => {
    mockProcess.stdin.setRawMode = undefined as any;

    setupInteractions(
      {},
      {
        logger: mockLogger,
        process: mockProcess,
        readline: mockReadline,
      }
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Interactive mode is not supported in this environment'
    );
  });

  it('should set up keypress events and interactions', () => {
    setupInteractions(
      {},
      {
        logger: mockLogger,
        process: mockProcess,
        readline: mockReadline,
      }
    );

    expect(mockReadline.emitKeypressEvents).toHaveBeenCalledWith(
      mockProcess.stdin
    );
    expect(mockProcess.stdin.setRawMode).toHaveBeenCalledWith(true);
    expect(mockProcess.stdin.on).toHaveBeenCalledWith(
      'keypress',
      expect.any(Function)
    );
  });

  it('should handle ctrl+c and ctrl+z keypresses', () => {
    setupInteractions(
      {},
      {
        logger: mockLogger,
        process: mockProcess,
        readline: mockReadline,
      }
    );

    const keypressHandler = (mockProcess.stdin.on as Mock).mock.calls[0][1];

    keypressHandler(null, { ctrl: true, name: 'c' });
    expect(mockProcess.exit).toHaveBeenCalled();

    keypressHandler(null, { ctrl: true, name: 'z' });
    expect(mockProcess.emit).toHaveBeenCalledWith('SIGTSTP', 'SIGTSTP');
  });

  it('should handle supported interactions', () => {
    const handlers: Parameters<typeof setupInteractions>[0] = {
      onReload: vi.fn(),
      onOpenDevMenu: vi.fn(),
      onOpenDevTools: vi.fn(),
    };

    setupInteractions(handlers, {
      logger: mockLogger,
      process: mockProcess,
      readline: mockReadline,
    });

    const keypressHandler = (mockProcess.stdin.on as Mock).mock.calls[0][1];

    keypressHandler(null, { ctrl: false, name: 'r' });
    expect(mockLogger.info).toHaveBeenCalledWith('Reloading app');
    expect(handlers.onReload).toHaveBeenCalledTimes(1);

    keypressHandler(null, { ctrl: false, name: 'd' });
    expect(mockLogger.info).toHaveBeenCalledWith('Opening developer menu');
    expect(handlers.onOpenDevMenu).toHaveBeenCalledTimes(1);

    keypressHandler(null, { ctrl: false, name: 'j' });
    expect(mockLogger.info).toHaveBeenCalledWith('Opening debugger');
    expect(handlers.onOpenDevTools).toHaveBeenCalledTimes(1);
  });

  it('should handle unsupported interactions', () => {
    const handlers: Parameters<typeof setupInteractions>[0] = {
      onReload: vi.fn(),
    };

    setupInteractions(handlers, {
      logger: mockLogger,
      process: mockProcess,
      readline: mockReadline,
    });

    expect(mockProcess.stdout.write).toHaveBeenCalledWith(' r: Reload app\n');
    expect(mockProcess.stdout.write).toHaveBeenCalledWith(
      ' d: Open developer menu (unsupported by the current bundler)\n'
    );

    const keypressHandler = (mockProcess.stdin.on as Mock).mock.calls[0][1];

    keypressHandler(null, { ctrl: false, name: 'd' });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Open developer menu is not supported by the used bundler'
    );
  });

  it('should properly invoke interaction action callbacks in partial action support scenarios', () => {
    const handlers: Parameters<typeof setupInteractions>[0] = {
      onReload: vi.fn(),
      onOpenDevTools: vi.fn(),
      // onOpenDevMenu - unsupported
    };

    setupInteractions(handlers, {
      logger: mockLogger,
      process: mockProcess,
      readline: mockReadline,
    });

    const keypressHandler = (mockProcess.stdin.on as Mock).mock.calls[0][1];

    keypressHandler(null, { ctrl: false, name: 'd' });
    expect(handlers.onReload).toHaveBeenCalledTimes(0);
    expect(handlers.onOpenDevTools).toHaveBeenCalledTimes(0);

    keypressHandler(null, { ctrl: false, name: 'r' });
    expect(handlers.onReload).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenDevTools).toHaveBeenCalledTimes(0);

    keypressHandler(null, { ctrl: false, name: 'r' });
    expect(handlers.onReload).toHaveBeenCalledTimes(2);
    expect(handlers.onOpenDevTools).toHaveBeenCalledTimes(0);

    keypressHandler(null, { ctrl: false, name: 'j' });
    expect(handlers.onReload).toHaveBeenCalledTimes(2);
    expect(handlers.onOpenDevTools).toHaveBeenCalledTimes(1);

    keypressHandler(null, { ctrl: false, name: 'j' });
    expect(handlers.onReload).toHaveBeenCalledTimes(2);
    expect(handlers.onOpenDevTools).toHaveBeenCalledTimes(2);
  });

  it('should quit on ctrl+c', () => {
    const handlers: Parameters<typeof setupInteractions>[0] = {
      onReload: vi.fn(),
      onOpenDevTools: vi.fn(),
    };

    setupInteractions(handlers, {
      logger: mockLogger,
      process: mockProcess,
      readline: mockReadline,
    });

    const keypressHandler = (mockProcess.stdin.on as Mock).mock.calls[0][1];

    keypressHandler(null, { ctrl: true, name: 'c' });
    expect(mockProcess.exit).toHaveBeenCalledTimes(1);
  });

  it('should quit on ctrl+z', () => {
    const handlers: Parameters<typeof setupInteractions>[0] = {
      onReload: vi.fn(),
      onOpenDevTools: vi.fn(),
    };

    setupInteractions(handlers, {
      logger: mockLogger,
      process: mockProcess,
      readline: mockReadline,
    });

    const keypressHandler = (mockProcess.stdin.on as Mock).mock.calls[0][1];

    keypressHandler(null, { ctrl: true, name: 'z' });
    expect(mockProcess.emit).toHaveBeenCalledTimes(1);
    expect(mockProcess.emit).toHaveBeenCalledWith('SIGTSTP', 'SIGTSTP');
  });

  describe.each([true, false])(
    'should properly display a list of supported interactions (debugger support: %s)',
    (debuggerSupport) => {
      it('should display interaction messages', () => {
        setupInteractions(
          {
            onOpenDevTools: debuggerSupport ? vi.fn() : undefined,
            onOpenDevMenu() {},
            onReload() {},
            onAdbReverse() {},
          },
          {
            logger: mockLogger,
            process: mockProcess,
            readline: mockReadline,
          }
        );

        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          1,
          ' r: Reload app\n'
        );
        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          2,
          ' d: Open developer menu\n'
        );
        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          3,
          ` j: Open debugger${debuggerSupport ? '' : ' (unsupported by the current bundler)'}\n`
        );
        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          4,
          ' a: Run adb reverse\n'
        );
        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          5,
          '\nPress Ctrl+c or Ctrl+z to quit the dev server\n\n'
        );
      });
    }
  );
});
