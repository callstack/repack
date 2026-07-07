import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceMapConsumer } from 'source-map';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * E2E coverage for dev-server stack-frame symbolication and open-stack-frame,
 * exercised against the real tester-federation-v2 host + mini-app dev servers.
 *
 * The Module Federation scenarios mirror a real-world setup: a shell app
 * whose error stacks contain frames from federated remote chunks served by a
 * separate dev server (e.g. `__federation_expose_X.<remote>.chunk.bundle`).
 *
 * Requires workspace packages to be built (`pnpm build`) beforehand.
 */

const HOST_PORT = 38081;
const MINI_PORT = 38082;
const PLATFORM = 'ios';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(dirname, '../../../apps/tester-federation-v2');
const reactNativeBin = path.join(appDir, 'node_modules/.bin/react-native');
const fakeEditor = path.join(dirname, 'fixtures/fake-editor.sh');

const REMOTE_CHUNK =
  '__federation_expose_MiniAppNavigator.MiniApp.chunk.bundle';

interface StackFrame {
  file: string;
  methodName: string;
  lineNumber: number;
  column: number;
}

interface SymbolicateResponse {
  status: number;
  body: {
    stack?: Array<Partial<StackFrame> & { collapse?: boolean }>;
    codeFrame?: { content: string; fileName: string } | null;
  };
}

let hostServer: ChildProcess;
let miniServer: ChildProcess;
let editorLog: string;
let hostAppFrame: StackFrame;
let miniNodeModulesFrame: StackFrame;
let remoteFrame: StackFrame;

function startServer(configFile: string, port: number): ChildProcess {
  const child = spawn(
    reactNativeBin,
    ['webpack-start', '--config', configFile, '--port', String(port)],
    {
      cwd: appDir,
      env: {
        ...process.env,
        REACT_EDITOR: fakeEditor,
        FAKE_EDITOR_LOG: editorLog,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    }
  );
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  return child;
}

function stopServer(child: ChildProcess | undefined) {
  if (child?.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
}

async function waitFor(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

/**
 * Finds the first generated position in a source map whose original source
 * matches the predicate, so tests use genuinely mapped coordinates instead
 * of guessed ones.
 *
 * Source names that are not URL-parseable are replaced before constructing
 * the consumer: Module Federation v2 emits a corrupt `webpack://` source
 * name (containing raw runtime code) into the host map, which makes
 * SourceMapConsumer throw 'Invalid URL'. The dev server has the same
 * problem — that bug is covered by the host-only symbolication test below.
 */
async function findMappedFrame(
  mapUrl: string,
  matchesSource: (source: string) => boolean,
  methodName: string
): Promise<StackFrame> {
  const response = await fetch(mapUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source map ${mapUrl}: ${response.status}`);
  }
  const rawMap = await response.json();
  rawMap.sources = (rawMap.sources ?? []).map(
    (source: string, index: number) => {
      try {
        new URL(source, 'file:///');
        return source;
      } catch {
        return `unparseable-source-${index}`;
      }
    }
  );
  const consumer = await new SourceMapConsumer(rawMap);
  let found: { line: number; column: number } | undefined;
  const stopIteration = new Error('stop');
  try {
    consumer.eachMapping((mapping) => {
      if (
        mapping.source &&
        mapping.originalLine != null &&
        mapping.originalLine > 1 &&
        mapping.generatedColumn > 0 &&
        matchesSource(mapping.source)
      ) {
        found = {
          line: mapping.generatedLine,
          column: mapping.generatedColumn,
        };
        throw stopIteration;
      }
    });
  } catch (error) {
    if (error !== stopIteration) throw error;
  } finally {
    consumer.destroy();
  }
  if (!found) {
    throw new Error(`No mapping matching predicate in ${mapUrl}`);
  }
  return {
    file: mapUrl.replace(/\.map(\?[^?]*)?$/, '$1'),
    methodName,
    lineNumber: found.line,
    column: found.column,
  };
}

async function symbolicate(
  port: number,
  stack: StackFrame[]
): Promise<SymbolicateResponse> {
  const response = await fetch(`http://localhost:${port}/symbolicate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stack }),
    signal: AbortSignal.timeout(30_000),
  });
  return { status: response.status, body: await response.json() };
}

async function openStackFrame(port: number, file: string, lineNumber: number) {
  const response = await fetch(`http://localhost:${port}/open-stack-frame`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ file, lineNumber }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.status;
}

function readEditorLog(): string[] {
  try {
    return fs
      .readFileSync(editorLog, 'utf8')
      .split('\n')
      .filter((line) => line.trim().length > 0);
  } catch {
    return [];
  }
}

/** Waits for the fake editor to record a new invocation, returning its argv. */
async function waitForEditorInvocation(
  sinceLength: number,
  timeoutMs = 5000
): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lines = readEditorLog();
    if (lines.length > sinceLength) {
      return lines[lines.length - 1];
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return undefined;
}

describe.skipIf(process.platform === 'win32')(
  'dev-server symbolication (tester-federation-v2)',
  () => {
    beforeAll(async () => {
      editorLog = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'repack-symbolication-e2e-')),
        'editor-invocations.log'
      );

      hostServer = startServer('config.host-app.mts', HOST_PORT);
      miniServer = startServer('config.mini-app.mts', MINI_PORT);

      await Promise.all([
        waitFor(
          `http://localhost:${HOST_PORT}/index.bundle?platform=${PLATFORM}`,
          180_000
        ),
        waitFor(
          `http://localhost:${MINI_PORT}/${PLATFORM}/${REMOTE_CHUNK}`,
          180_000
        ),
      ]);

      // Shared dependencies are split into their own chunks under MFv2;
      // the manifest tells us where they live. Use one as a source of
      // node_modules-mapped frames.
      const manifest = await (
        await fetch(
          `http://localhost:${MINI_PORT}/${PLATFORM}/mf-manifest.json`
        )
      ).json();
      const sharedChunk = manifest.shared?.flatMap(
        (shared: { assets?: { js?: { sync?: string[] } } }) =>
          shared.assets?.js?.sync ?? []
      )[0];
      if (!sharedChunk) {
        throw new Error('No shared chunk found in mf-manifest.json');
      }

      [hostAppFrame, miniNodeModulesFrame, remoteFrame] = await Promise.all([
        findMappedFrame(
          `http://localhost:${HOST_PORT}/index.bundle.map?platform=${PLATFORM}`,
          (source) => source.includes('/src/host/'),
          'HostComponent'
        ),
        findMappedFrame(
          `http://localhost:${MINI_PORT}/${PLATFORM}/${sharedChunk}.map`,
          (source) => source.includes('node_modules'),
          'internalHelper'
        ),
        findMappedFrame(
          `http://localhost:${MINI_PORT}/${PLATFORM}/${REMOTE_CHUNK}.map`,
          (source) => source.endsWith('.tsx'),
          'Screen1'
        ),
      ]);
    }, 300_000);

    afterAll(() => {
      stopServer(hostServer);
      stopServer(miniServer);
    });

    it('symbolicates own frames on a server without corrupt map sources (control)', async () => {
      // The mini-app dev server owns the remote chunk and its map is clean,
      // so this exercises the baseline symbolication workflow.
      const { status, body } = await symbolicate(MINI_PORT, [remoteFrame]);

      expect(status).toBe(200);
      expect(body.stack).toHaveLength(1);
      expect(body.stack?.[0].file).toMatch(/^\[projectRoot\]\/src\/mini\//);
      expect(body.codeFrame).toBeTruthy();
    });

    it('symbolicates a host-only stack on a Module Federation v2 host', async () => {
      // MFv2 emits a corrupt `webpack://` source name (raw runtime code)
      // into the host map; symbolication must survive it instead of
      // failing the whole request with 'Invalid URL'.
      const { status, body } = await symbolicate(HOST_PORT, [hostAppFrame]);

      expect(status).toBe(200);
      expect(body.stack).toHaveLength(1);
      expect(body.stack?.[0].file).toMatch(/^\[projectRoot\]\/src\/host\//);
    });

    it('symbolicates a federated remote chunk frame on the host server', async () => {
      // Mirrors the reported failure: the shell's dev server is asked to
      // symbolicate a frame from a remote served by another dev server.
      const { status, body } = await symbolicate(HOST_PORT, [remoteFrame]);

      expect(status).toBe(200);
      expect(body.stack?.[0].file).toMatch(/^\[projectRoot\]\/src\/mini\//);
      expect(body.stack?.[0].lineNumber).toBeGreaterThan(1);
    });

    it('symbolicates host frames even when the stack contains a remote frame', async () => {
      // One foreign frame must not poison symbolication of frames the
      // host compiler owns.
      const { status, body } = await symbolicate(HOST_PORT, [
        remoteFrame,
        hostAppFrame,
      ]);

      expect(status).toBe(200);
      const hostFrame = body.stack?.find((frame) =>
        frame.file?.startsWith('[projectRoot]/src/host/')
      );
      expect(hostFrame).toBeTruthy();
    });

    it('opens the editor for a [projectRoot] stack frame', async () => {
      const logLength = readEditorLog().length;

      const status = await openStackFrame(
        HOST_PORT,
        '[projectRoot]/src/host/App.tsx',
        1
      );
      expect(status).toBe(200);

      const invocation = await waitForEditorInvocation(logLength);
      expect(invocation).toBeTruthy();
      expect(invocation).toContain(path.join(appDir, 'src/host/App.tsx'));
    });

    it('opens the editor for node_modules frames as returned by /symbolicate', async () => {
      // Whatever file value /symbolicate produces must be a valid input for
      // /open-stack-frame. node_modules frames symbolicate to parent-escape
      // tokens (e.g. [projectRoot^2]/node_modules/...) which are returned
      // URL-encoded ([projectRoot%5E2]/...) and must still resolve to a
      // real file on disk.
      const { status, body } = await symbolicate(MINI_PORT, [
        miniNodeModulesFrame,
      ]);
      expect(status).toBe(200);
      const symbolicatedFile = body.stack?.[0].file;
      expect(symbolicatedFile).toContain('node_modules');

      const logLength = readEditorLog().length;
      const openStatus = await openStackFrame(
        MINI_PORT,
        symbolicatedFile as string,
        body.stack?.[0].lineNumber ?? 1
      );
      expect(openStatus).toBe(200);

      const invocation = await waitForEditorInvocation(logLength);
      expect(
        invocation,
        `expected the editor to be invoked for ${symbolicatedFile}, but it never was`
      ).toBeTruthy();
      expect(fs.existsSync(invocation?.replace(/:\d+$/, '') ?? '')).toBe(true);
    });
  }
);
