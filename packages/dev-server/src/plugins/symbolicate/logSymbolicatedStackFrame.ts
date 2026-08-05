import type { FastifyBaseLogger } from 'fastify';
import { isGeneratedBundleFrame } from '../../utils/symbolication.js';
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

function getPrintableFile(file: string) {
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

  const frame = results.stack.find(
    (stackFrame) => !isGeneratedBundleFrame(stackFrame)
  );
  if (!frame?.file || frame.lineNumber == null) {
    return;
  }

  const file = getPrintableFile(frame.file);
  logger.info({
    msg: `Symbolicated stack frame: ${file}:${frame.lineNumber}:${frame.column ?? 0}`,
    methodName: frame.methodName,
  });
}
