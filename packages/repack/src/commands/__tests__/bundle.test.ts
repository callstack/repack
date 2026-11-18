import { type BundleCompiler, runCompiler } from '../bundle.js';

type Callback = (error: Error | null) => void;

function createCompilerMock(error: Error | null) {
  return {
    run: jest.fn((callback: Callback) => callback(error)),
    watch: jest.fn((_: unknown, callback: Callback) => callback(error)),
    close: jest.fn((callback: Callback) => callback(null)),
    hooks: { watchClose: { tap: jest.fn() } },
    options: { stats: undefined },
    context: '/project',
  } satisfies BundleCompiler;
}

// mirrors `bundle`'s handler, which throws a CLIError for compiler errors
const onResult = async (error: Error | null) => {
  if (error) throw error;
};

describe('runCompiler', () => {
  it('resolves after closing the compiler when the build succeeds', async () => {
    const compiler = createCompilerMock(null);

    await expect(runCompiler(compiler, { onResult })).resolves.toBeUndefined();
    expect(compiler.close).toHaveBeenCalledTimes(1);
  });

  it('rejects when the build fails', async () => {
    const compiler = createCompilerMock(new Error('hermesc failed'));

    await expect(runCompiler(compiler, { onResult })).rejects.toThrow(
      'hermesc failed'
    );
    expect(compiler.close).toHaveBeenCalledTimes(1);
  });

  it('rejects when a build fails in watch mode', async () => {
    const compiler = createCompilerMock(new Error('hermesc failed'));

    await expect(
      runCompiler(compiler, { watch: true, onResult })
    ).rejects.toThrow('hermesc failed');
    expect(compiler.run).not.toHaveBeenCalled();
  });

  it('resolves when watching stops', async () => {
    const compiler = createCompilerMock(null);
    compiler.hooks.watchClose.tap.mockImplementation(
      (_: string, onClose: () => void) => onClose()
    );

    await expect(
      runCompiler(compiler, { watch: true, onResult })
    ).resolves.toBeUndefined();
  });
});
