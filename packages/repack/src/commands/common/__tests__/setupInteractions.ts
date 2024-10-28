import type readline from 'node:readline';

import type { Logger } from '../../../types';
import { setupInteractions } from '../setupInteractions';

// eliminate ANSI colors formatting for proper assertions
jest.mock('colorette', () => ({
  ...jest.requireActual('colorette').createColors({ useColor: false }),
}));

describe('setupInteractions', () => {
  let mockLogger: Logger;
  let mockProcess: NodeJS.Process;
  let mockReadline: typeof readline;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;

    mockProcess = {
      stdin: {
        setRawMode: jest.fn(),
        on: jest.fn(),
      },
      stdout: {
        write: jest.fn(),
      },
      exit: jest.fn(),
      emit: jest.fn(),
    } as unknown as NodeJS.Process;

    mockReadline = {
      emitKeypressEvents: jest.fn(),
    } as unknown as typeof readline;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should log a warning if setRawMode is not available', () => {
    mockProcess.stdin.setRawMode = undefined as any;

    setupInteractions({}, mockLogger, mockProcess, mockReadline);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Interactive mode is not supported in this environment'
    );
  });

  it('should set up keypress events and interactions', () => {
    setupInteractions({}, mockLogger, mockProcess, mockReadline);

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
    setupInteractions({}, mockLogger, mockProcess, mockReadline);

    const keypressHandler = (mockProcess.stdin.on as jest.Mock).mock
      .calls[0][1];

    keypressHandler(null, { ctrl: true, name: 'c' });
    expect(mockProcess.exit).toHaveBeenCalled();

    keypressHandler(null, { ctrl: true, name: 'z' });
    expect(mockProcess.emit).toHaveBeenCalledWith('SIGTSTP', 'SIGTSTP');
  });

  it('should handle supported interactions', () => {
    const handlers: Parameters<typeof setupInteractions>[0] = {
      onReload: jest.fn(),
      onOpenDevMenu: jest.fn(),
      onOpenDevTools: jest.fn(),
    };

    setupInteractions(handlers, mockLogger, mockProcess, mockReadline);

    const keypressHandler = (mockProcess.stdin.on as jest.Mock).mock
      .calls[0][1];

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
      onReload: jest.fn(),
    };

    setupInteractions(handlers, mockLogger, mockProcess, mockReadline);

    expect(mockProcess.stdout.write).toHaveBeenCalledWith('r: Reload app\n');
    expect(mockProcess.stdout.write).toHaveBeenCalledWith(
      'd: Open developer menu (unsupported by the current bundler)\n'
    );

    const keypressHandler = (mockProcess.stdin.on as jest.Mock).mock
      .calls[0][1];

    keypressHandler(null, { ctrl: false, name: 'd' });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Open developer menu is not supported by the used bundler'
    );
  });

  it('should properly invoke interaction action callbacks in partial action support scenarios', () => {
    const handlers: Parameters<typeof setupInteractions>[0] = {
      onReload: jest.fn(),
      onOpenDevTools: jest.fn(),
      // onOpenDevMenu - unsupported
    };

    setupInteractions(handlers, mockLogger, mockProcess, mockReadline);

    const keypressHandler = (mockProcess.stdin.on as jest.Mock).mock
      .calls[0][1];

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
      onReload: jest.fn(),
      onOpenDevTools: jest.fn(),
    };

    setupInteractions(handlers, mockLogger, mockProcess, mockReadline);

    const keypressHandler = (mockProcess.stdin.on as jest.Mock).mock
      .calls[0][1];

    keypressHandler(null, { ctrl: true, name: 'c' });
    expect(mockProcess.exit).toHaveBeenCalledTimes(1);
  });

  it('should quit on ctrl+z', () => {
    const handlers: Parameters<typeof setupInteractions>[0] = {
      onReload: jest.fn(),
      onOpenDevTools: jest.fn(),
    };

    setupInteractions(handlers, mockLogger, mockProcess, mockReadline);

    const keypressHandler = (mockProcess.stdin.on as jest.Mock).mock
      .calls[0][1];

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
            onOpenDevTools: debuggerSupport ? jest.fn() : undefined,
            onOpenDevMenu() {},
            onReload() {},
          },
          mockLogger,
          mockProcess,
          mockReadline
        );

        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          1,
          'You can use the following keystrokes:\n'
        );
        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          2,
          'r: Reload app\n'
        );
        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          3,
          'd: Open developer menu\n'
        );
        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          4,
          `j: Open debugger${debuggerSupport ? '' : ' (unsupported by the current bundler)'}\n`
        );
        expect(mockProcess.stdout.write).toHaveBeenNthCalledWith(
          5,
          '\nPress ctrl+c or ctrl+z to quit the dev server\n'
        );
      });
    }
  );
});
