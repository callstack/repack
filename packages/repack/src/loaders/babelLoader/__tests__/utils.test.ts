import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getBabelCaller, getBabelRuntime } from '../utils.js';

function createProject(babelRuntimeVersion?: string) {
  const projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-babel-caller-'))
  );
  if (babelRuntimeVersion) {
    const runtimeDir = path.join(projectRoot, 'node_modules/@babel/runtime');
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.writeFileSync(
      path.join(runtimeDir, 'package.json'),
      JSON.stringify({ name: '@babel/runtime', version: babelRuntimeVersion })
    );
  }
  return projectRoot;
}

describe('getBabelRuntime', () => {
  it("returns the location and version of the project's @babel/runtime", () => {
    const projectRoot = createProject('7.99.0');

    expect(getBabelRuntime(projectRoot)).toEqual({
      babelRuntimeModuleName: path.join(
        projectRoot,
        'node_modules/@babel/runtime'
      ),
      enableBabelRuntime: '7.99.0',
    });
  });
});

describe('getBabelCaller', () => {
  const projectRoot = createProject('7.99.0');
  const babelRuntime = getBabelRuntime(projectRoot);
  const context = path.join(projectRoot, 'src');

  it('reads the platform exposed by BabelPlugin', () => {
    expect(
      getBabelCaller({
        context,
        rootContext: projectRoot,
        repack: { platform: 'ios' },
        // the plugin value wins over the compiler name
        _compiler: { options: { name: 'android' } },
      })
    ).toEqual({
      name: '@callstack/repack',
      platform: 'ios',
      inlinePlatform: true,
      ...babelRuntime,
    });
  });

  it('falls back to the compiler name as the platform', () => {
    expect(
      getBabelCaller({
        context,
        rootContext: projectRoot,
        _compiler: { options: { name: 'android' } },
      })
    ).toMatchObject({ platform: 'android', inlinePlatform: true });
  });

  it('does not enable platform inlining when the platform is unknown', () => {
    // parallel loaders in Rspack get a compiler without most of its options
    const caller = getBabelCaller({
      context,
      rootContext: projectRoot,
      _compiler: { options: {} },
    });

    expect(caller).toEqual({ name: '@callstack/repack', ...babelRuntime });
  });
});
