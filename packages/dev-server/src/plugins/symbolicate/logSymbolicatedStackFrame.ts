import type { FastifyBaseLogger } from 'fastify';
import {
  isGeneratedBundleFrame,
  isSymbolicatableFrame,
} from '../../utils/symbolication.js';
import type { ReactNativeStackFrame, SymbolicatorResults } from './types.js';

const RUNTIME_ERROR_METHODS = new Set([
  'react-stack-bottom-frame',
  'renderWithHooks',
  'beginWork',
  'performUnitOfWork',
]);

function isRuntimeErrorStack(stack: ReactNativeStackFrame[]) {
  return stack.some((frame) => RUNTIME_ERROR_METHODS.has(frame.methodName));
}

const REMOTE_SOURCE_PATH_PREFIX = '/__repack_source__/';

function getRemoteName(file: string | null | undefined) {
  if (!file) {
    return undefined;
  }

  const filename = new URL(file, 'file://').pathname.split('/').pop() ?? '';
  return filename.match(/\.([^.]+)\.chunk\.bundle$/)?.[1];
}

function getPrintableFile(file: string, inputFile?: string | null) {
  const sourceUrl = new URL(file, 'file://');
  if (sourceUrl.pathname.startsWith(REMOTE_SOURCE_PATH_PREFIX)) {
    const source = decodeURIComponent(
      sourceUrl.pathname.slice(REMOTE_SOURCE_PATH_PREFIX.length)
    ).replace(/^\[projectRoot(?:\^\d+)?\][\\/]/, '');
    return `${getRemoteName(inputFile) ?? sourceUrl.host}/${source}`;
  }

  return file.replace(/^\[projectRoot(?:\^\d+)?\][\\/]/, '');
}

export function logSymbolicatedStackFrame(
  logger: FastifyBaseLogger,
  inputStack: ReactNativeStackFrame[],
  results: SymbolicatorResults
) {
  if (!isRuntimeErrorStack(inputStack)) {
    return;
  }

  const frameIndex = results.stack.findIndex(
    (stackFrame) => !isGeneratedBundleFrame(stackFrame)
  );
  const frame = results.stack[frameIndex];
  if (!frame?.file || frame.lineNumber == null) {
    return;
  }

  const inputFrames = inputStack.filter(isSymbolicatableFrame);
  const file = getPrintableFile(frame.file, inputFrames[frameIndex]?.file);
  logger.info({
    msg: `Symbolicated stack frame: ${file}:${frame.lineNumber}:${frame.column ?? 0}`,
    methodName: frame.methodName,
  });
}
