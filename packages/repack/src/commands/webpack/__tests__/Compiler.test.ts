import type { EventEmitter } from 'node:events';
import { Worker } from 'node:worker_threads';
import { fs, vol } from 'memfs';
import type { Reporter } from '../../../logging/types.js';
import { Compiler } from '../Compiler.js';

jest.mock('node:fs', () => jest.requireActual('memfs').fs);

jest.mock('node:worker_threads', () => {
  const { EventEmitter } =
    jest.requireActual<typeof import('node:events')>('node:events');

  return {
    Worker: jest.fn(() =>
      Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        terminate: jest.fn(() => Promise.resolve(0)),
      })
    ),
  };
});

test('rejects a pending asset request when the worker reports an error', async () => {
  const reporter: Reporter = {
    process: jest.fn(),
    flush: jest.fn(),
    stop: jest.fn(),
  };
  const compiler = new Compiler(
    ['ios'],
    { host: '' },
    reporter,
    '/project',
    '/react-native'
  );

  const request = compiler.getAsset('index.bundle', 'ios');
  const worker = jest.mocked(Worker).mock.results[0].value as EventEmitter;
  const error = new Error('Compilation failed');

  worker.emit('message', { event: 'error', error });

  expect(compiler.resolvers.ios).toHaveLength(0);
  await expect(request).rejects.toBe(error);
});

test('terminates active workers when closed', async () => {
  const reporter: Reporter = {
    process: jest.fn(),
    flush: jest.fn(),
    stop: jest.fn(),
  };
  const compiler = new Compiler(
    ['ios'],
    { host: '' },
    reporter,
    '/project',
    '/react-native'
  );
  const worker = new Worker('worker.js');
  compiler.workers.ios = worker;

  await new Promise<void>((resolve, reject) => {
    compiler.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  expect(worker.terminate).toHaveBeenCalledTimes(1);
});

describe('getSource', () => {
  const reporter: Reporter = {
    process: jest.fn(),
    flush: jest.fn(),
    stop: jest.fn(),
  };

  const createCompiler = () =>
    new Compiler(['ios'], { host: '' }, reporter, '/project', '/react-native');

  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('reads an absolute filename as-is', async () => {
    vol.fromJSON({ '/outside/project/file.js': 'absolute source' });
    const readFile = jest.spyOn(fs.promises, 'readFile');

    await expect(
      createCompiler().getSource('/outside/project/file.js', 'ios')
    ).resolves.toBe('absolute source');
    expect(readFile).toHaveBeenCalledWith('/outside/project/file.js', 'utf8');
  });

  test('resolves a relative filename against the project root', async () => {
    vol.fromJSON({ '/project/src/index.js': 'source under the project root' });
    const readFile = jest.spyOn(fs.promises, 'readFile');

    await expect(
      createCompiler().getSource('src/index.js', 'ios')
    ).resolves.toBe('source under the project root');
    expect(readFile).toHaveBeenCalledWith('/project/src/index.js', 'utf8');
  });
});
