import childProcess from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import launchEditor from 'launch-editor';
import open from 'open';
import type { Server } from '../../types.js';

const require = createRequire(import.meta.url);
const macosEditors = require('launch-editor/editor-info/macos.js') as Record<
  string,
  string
>;

interface OpenURLRequestBody {
  url: string;
}

interface OpenStackFrameRequestBody {
  file: string;
  lineNumber: number;
}

function parseRequestBody<T>(body: unknown): T {
  if (typeof body === 'object') return body as T;
  if (typeof body === 'string') return JSON.parse(body) as T;
  throw new Error(`Unsupported body type: ${typeof body}`);
}

let cachedEditorCommand: string | undefined;

const commonEditorBinDirs = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  process.env.HOME
    ? path.join(
        process.env.HOME,
        'Library/Application Support/JetBrains/Toolbox/scripts'
      )
    : undefined,
].filter(Boolean) as string[];

function isPathInside(filepath: string, root: string): boolean {
  const relativePath = path.relative(root, filepath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

function getProjectRelativeFile(file: string): string | undefined {
  if (!file.startsWith('[projectRoot]/')) {
    return undefined;
  }

  const relativeFile = path.normalize(file.slice('[projectRoot]/'.length));
  if (
    relativeFile === '.' ||
    path.isAbsolute(relativeFile) ||
    relativeFile.split(/[\\/]+/).includes('..')
  ) {
    return undefined;
  }

  return relativeFile;
}

function resolveStackFrameFile(
  file: string,
  delegate: Server.Delegate
): string {
  const filepath = delegate.devTools?.resolveProjectPath(file) ?? file;

  if (!delegate.devTools?.resolveProjectPath) {
    return filepath;
  }

  const relativeFile = getProjectRelativeFile(file);
  if (!relativeFile) {
    return filepath;
  }

  const shellRoot = delegate.devTools.resolveProjectPath('[projectRoot]');
  const projectFile = path.join(shellRoot, relativeFile);
  if (isPathInside(projectFile, shellRoot) && fs.existsSync(projectFile)) {
    return projectFile;
  }

  return filepath;
}

function findCommand(command: string | undefined): string | undefined {
  if (!command) {
    return undefined;
  }

  if (path.isAbsolute(command)) {
    return fs.existsSync(command) ? command : undefined;
  }

  const result = childProcess.spawnSync(
    'sh',
    ['-lc', 'command -v "$1"', 'sh', command],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 500,
    }
  );
  const commandPath = result.stdout?.trim().split('\n')[0];
  if (commandPath) {
    return commandPath;
  }

  for (const binDir of commonEditorBinDirs) {
    const candidate = path.join(binDir, command);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
}

function resolveLaunchCommand(launchCommand: string): string | undefined {
  if (path.isAbsolute(launchCommand) && fs.existsSync(launchCommand)) {
    return launchCommand;
  }

  const cliCommand = findCommand(path.basename(launchCommand));
  if (cliCommand) {
    return cliCommand;
  }

  return findCommand(launchCommand);
}

function quoteEditorCommand(command: string): string {
  return command.includes(' ') ? JSON.stringify(command) : command;
}

function getEditorCommand(editor: string | undefined): string | undefined {
  if (editor || process.platform !== 'darwin') {
    return editor;
  }

  if (cachedEditorCommand !== undefined) {
    return cachedEditorCommand;
  }

  try {
    const output = childProcess
      .execSync('ps x -o comm=', {
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 500,
      })
      .toString();
    const processList = output.split('\n');

    for (const [processName, launchCommand] of Object.entries(macosEditors)) {
      const processNameWithoutApplications = processName.replace(
        '/Applications',
        ''
      );
      const isRunning =
        processList.includes(processName) ||
        output.includes(processNameWithoutApplications);
      if (!isRunning) {
        continue;
      }

      const resolvedLaunchCommand = resolveLaunchCommand(launchCommand);
      if (resolvedLaunchCommand) {
        cachedEditorCommand = quoteEditorCommand(resolvedLaunchCommand);
        return cachedEditorCommand;
      }

      if (fs.existsSync(processName)) {
        cachedEditorCommand = quoteEditorCommand(processName);
        return cachedEditorCommand;
      }

      const runningProcess = processList.find((procName) =>
        procName.endsWith(processNameWithoutApplications)
      );
      if (runningProcess && fs.existsSync(runningProcess)) {
        cachedEditorCommand = quoteEditorCommand(runningProcess);
        return cachedEditorCommand;
      }

      break;
    }
  } catch {
    // Fall back to launch-editor's default editor detection.
  }

  cachedEditorCommand = editor;
  return cachedEditorCommand;
}

function prewarmEditorCommand() {
  if (process.env.REACT_EDITOR || process.platform !== 'darwin') {
    return;
  }

  setTimeout(() => {
    try {
      getEditorCommand(process.env.REACT_EDITOR);
    } catch {
      // Keep startup resilient; the next stack-frame tap can retry detection.
    }
  }, 0);
}

async function devtoolsPlugin(
  instance: FastifyInstance,
  { delegate }: { delegate: Server.Delegate }
) {
  prewarmEditorCommand();

  // reference implementation in `@react-native-community/cli-server-api`:
  // https://github.com/react-native-community/cli/blob/46436a12478464752999d34ed86adf3212348007/packages/cli-server-api/src/openURLMiddleware.ts
  instance.route({
    method: ['POST'],
    url: '/open-url',
    handler: async (request, reply) => {
      const { url } = parseRequestBody<OpenURLRequestBody>(request.body);
      await open(url);
      reply.send('OK');
    },
  });

  // reference implementation in `@react-native-community/cli-server-api`:
  // https://github.com/react-native-community/cli/blob/46436a12478464752999d34ed86adf3212348007/packages/cli-server-api/src/openStackFrameMiddleware.ts
  instance.route({
    method: ['POST'],
    url: '/open-stack-frame',
    handler: async (request, reply) => {
      const { file, lineNumber } = parseRequestBody<OpenStackFrameRequestBody>(
        request.body
      );
      const filepath = resolveStackFrameFile(file, delegate);
      launchEditor(
        `${filepath}:${lineNumber}`,
        getEditorCommand(process.env.REACT_EDITOR)
      );
      reply.send('OK');
    },
  });

  instance.route({
    method: ['GET', 'POST', 'PUT'],
    url: '/reload',
    handler: (_request, reply) => {
      instance.wss.messageServer.broadcast('reload');
      reply.send('OK');
    },
  });
}

export default fastifyPlugin(devtoolsPlugin, {
  name: 'devtools-plugin',
  dependencies: ['wss-plugin'],
});
