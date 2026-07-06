// `checkParallelModeAvailable` keeps a module-level "warning already shown"
// flag, so each test re-requires a fresh copy of the module. The untyped
// `require` also lets tests pass minimal loader-context fakes without casting
// to the full Rspack `LoaderContext` interface.
type CheckParallelModeAvailable = (
  loaderContext: unknown,
  logger: unknown
) => void;

const loadCheckParallelModeAvailable = (): CheckParallelModeAvailable => {
  let checkParallelModeAvailable: CheckParallelModeAvailable | undefined;
  jest.isolateModules(() => {
    ({ checkParallelModeAvailable } = require('../utils.js'));
  });
  if (!checkParallelModeAvailable) {
    throw new Error('failed to load checkParallelModeAvailable');
  }
  return checkParallelModeAvailable;
};

const createLogger = () => ({ warn: jest.fn() });

const createRspackContext = (
  rspackVersion: string,
  experiments: Record<string, unknown> | undefined
) => ({
  _compiler: {
    webpack: { version: '5.75.0', rspackVersion },
    options: { experiments },
  },
});

describe('checkParallelModeAvailable', () => {
  it('warns under rspack 1 when parallelLoader is enabled globally but not for this loader', () => {
    const check = loadCheckParallelModeAvailable();
    const logger = createLogger();
    check(createRspackContext('1.5.0', { parallelLoader: true }), logger);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('experiments.parallelLoader')
    );
  });

  it('warns only once', () => {
    const check = loadCheckParallelModeAvailable();
    const logger = createLogger();
    check(createRspackContext('1.5.0', { parallelLoader: true }), logger);
    check(createRspackContext('1.5.0', { parallelLoader: true }), logger);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn under rspack 1 when parallelLoader is not enabled', () => {
    const check = loadCheckParallelModeAvailable();
    const logger = createLogger();
    check(createRspackContext('1.5.0', {}), logger);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not warn under rspack 2 (parallelLoader global flag no longer exists)', () => {
    const check = loadCheckParallelModeAvailable();
    const logger = createLogger();
    // even with a leftover parallelLoader flag in the config, the version
    // gate skips the check - running non-parallel is valid under rspack 2
    check(createRspackContext('2.0.0', { parallelLoader: true }), logger);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not warn under rspack 2 prereleases', () => {
    const check = loadCheckParallelModeAvailable();
    const logger = createLogger();
    check(
      createRspackContext('2.0.0-beta.1', { parallelLoader: true }),
      logger
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not warn on webpack', () => {
    const check = loadCheckParallelModeAvailable();
    const logger = createLogger();
    const webpackContext = {
      _compiler: {
        webpack: { version: '5.75.0' },
        options: { experiments: { parallelLoader: true } },
      },
    };
    check(webpackContext, logger);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not warn in parallel mode where the compiler is mocked', () => {
    const check = loadCheckParallelModeAvailable();
    const logger = createLogger();
    // in parallel mode the compiler object is mocked without most props
    check({ _compiler: { webpack: {} } }, logger);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
