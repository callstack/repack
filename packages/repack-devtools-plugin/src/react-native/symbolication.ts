import {
  getProp,
  isRecord,
  readArray,
  readBoolean,
  readNumber,
  readString,
} from '../shared/guards';
import { stripAnsi } from '../shared/text';
import type {
  Diagnostic,
  SourceMapCheck,
  StackFrame,
  SymbolicatedFrame,
  SymbolicationResult,
} from '../shared/types';

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => Promise<{
  status: number;
  ok: boolean;
  text(): Promise<string>;
}>;

const LOCATION = /^(.*):(\d+):(\d+)$/;

const parseLocation = (value: string) => {
  const match = LOCATION.exec(value.trim());
  if (!match) return undefined;
  return {
    file: match[1].replace(/^address at /, ''),
    lineNumber: Number(match[2]),
    column: Number(match[3]),
  };
};

/**
 * Parses Hermes (`at fn (file:1:2)`, `at fn (address at file:1:2)`,
 * `at file:1:2`) and JSC (`fn@file:1:2`) stack lines into the frame shape
 * React Native posts to `/symbolicate`.
 */
export const parseStack = (stack: string): StackFrame[] => {
  const frames: StackFrame[] = [];
  for (const rawLine of stack.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    let match = /^at (.+?) \((.+)\)$/.exec(line);
    if (match) {
      const location = parseLocation(match[2]);
      frames.push(
        location
          ? { methodName: match[1], ...location }
          : { methodName: match[1] }
      );
      continue;
    }

    match = /^at (.+)$/.exec(line);
    if (match) {
      const location = parseLocation(match[1]);
      if (location) frames.push({ methodName: '<unknown>', ...location });
      continue;
    }

    match = /^(.*?)@(.+)$/.exec(line);
    if (match) {
      const location = parseLocation(match[2]);
      if (location) {
        frames.push({ methodName: match[1] || '<unknown>', ...location });
      }
    }
  }
  return frames;
};

const isBundleUrl = (file?: string) => !!file && /^https?:\/\//.test(file);

/** Mirrors the platform inference in Re.Pack's `/symbolicate` endpoint. */
export const inferPlatform = (frames: StackFrame[]) => {
  for (const frame of frames) {
    if (!frame.file) continue;
    try {
      const { searchParams, pathname } = new URL(frame.file, 'file://');
      const platform = searchParams.get('platform');
      if (platform) return platform;
      const [bundleFilename = ''] = pathname.split('/').reverse();
      const [, platformOrExtension, extension] = bundleFilename.split('.');
      if (extension) return platformOrExtension;
    } catch {
      // ignore malformed URLs, like the dev server does
    }
  }
  return undefined;
};

const toStackFrame = (
  value: unknown
): (StackFrame & { collapse?: boolean }) | undefined =>
  isRecord(value)
    ? {
        methodName: readString(value, 'methodName') ?? '<unknown>',
        file: readString(value, 'file'),
        lineNumber: readNumber(value, 'lineNumber'),
        column: readNumber(value, 'column'),
        collapse: readBoolean(value, 'collapse'),
      }
    : undefined;

const toCodeFrame = (value: unknown): SymbolicationResult['codeFrame'] => {
  const content = readString(value, 'content');
  return content === undefined
    ? undefined
    : {
        // Metro-style code frames are coloured for terminals
        content: stripAnsi(content),
        fileName: readString(value, 'fileName'),
        location: getProp(value, 'location'),
      };
};

export const getSourceMapUrl = (bundleUrl: string) => {
  const [path, query] = bundleUrl.split('?');
  return `${path}.map${query ? `?${query}` : ''}`;
};

export const symbolicateStack = async (
  stack: string | StackFrame[],
  options: { devServer?: string; fetch?: FetchLike; checkSourceMaps?: boolean }
): Promise<SymbolicationResult> => {
  const frames = typeof stack === 'string' ? parseStack(stack) : stack;
  const diagnostics: Diagnostic[] = [];
  const fetchImpl: FetchLike = options.fetch ?? globalThis.fetch;
  const result: SymbolicationResult = {
    devServer: options.devServer,
    frames: frames.map((frame) => ({
      original: frame,
      unmapped: isBundleUrl(frame.file),
    })),
    sourceMaps: [],
    diagnostics,
  };

  if (frames.length === 0) {
    diagnostics.push({
      severity: 'warning',
      area: 'symbolication',
      message: 'No stack frames could be parsed from the input.',
      hint: 'Pass the raw `error.stack` string (Hermes or JSC format) or an error id from list-errors.',
    });
    return result;
  }

  if (!inferPlatform(frames)) {
    diagnostics.push({
      severity: 'warning',
      area: 'symbolication',
      message:
        'No frame has a bundle URL with a platform, so the dev server will reject this stack with 400 "Cannot infer platform from stack trace".',
      hint: 'Frames from native code, `InternalBytecode.js` or eval-ed code cannot be symbolicated.',
    });
  }

  if (!options.devServer) {
    diagnostics.push({
      severity: 'error',
      area: 'symbolication',
      message: 'Dev server origin is unknown; cannot call /symbolicate.',
    });
    return result;
  }

  try {
    // Re.Pack's /symbolicate drops frames without a bundle URL and returns
    // only the rest, so post exactly those and match the results by position.
    const bundleFrames = frames.filter((frame) => isBundleUrl(frame.file));
    const response = await fetchImpl(`${options.devServer}/symbolicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stack: bundleFrames }),
    });
    result.status = response.status;
    const text = await response.text();
    if (!response.ok) {
      result.error = text.slice(0, 2000);
      diagnostics.push({
        severity: 'error',
        area: 'symbolication',
        message: `/symbolicate responded with ${response.status}: ${result.error}`,
      });
    } else {
      const body: unknown = JSON.parse(text);
      const symbolicatedStack = readArray(body, 'stack').map(toStackFrame);
      result.codeFrame = toCodeFrame(getProp(body, 'codeFrame'));
      result.frames = frames.map((original) => {
        const position = bundleFrames.indexOf(original);
        const symbolicated =
          position === -1 ? undefined : symbolicatedStack[position];
        const unmapped =
          isBundleUrl(original.file) &&
          (!symbolicated ||
            isBundleUrl(symbolicated.file) ||
            (symbolicated.file === original.file &&
              symbolicated.lineNumber === original.lineNumber));
        return {
          original,
          symbolicated,
          unmapped,
          collapse: symbolicated?.collapse,
        } satisfies SymbolicatedFrame;
      });
    }
  } catch (error) {
    result.error = String(error);
    diagnostics.push({
      severity: 'error',
      area: 'symbolication',
      message: `Could not reach ${options.devServer}/symbolicate: ${String(error)}`,
    });
  }

  const unmappedBundles = new Map<string, number>();
  for (const frame of result.frames) {
    if (frame.unmapped && frame.original.file) {
      const key = frame.original.file;
      unmappedBundles.set(key, (unmappedBundles.get(key) ?? 0) + 1);
    }
  }

  if (options.checkSourceMaps !== false) {
    for (const bundleUrl of unmappedBundles.keys()) {
      const check: SourceMapCheck = {
        bundleUrl,
        sourceMapUrl: getSourceMapUrl(bundleUrl),
      };
      try {
        const response = await fetchImpl(check.sourceMapUrl, {
          method: 'HEAD',
        });
        check.status = response.status;
      } catch (error) {
        check.error = String(error);
      }
      result.sourceMaps.push(check);
    }
  }

  for (const [bundleUrl, count] of unmappedBundles) {
    const check = result.sourceMaps.find(
      (item) => item.bundleUrl === bundleUrl
    );
    diagnostics.push({
      severity: 'warning',
      area: 'symbolication',
      message: `${count} frame(s) in ${bundleUrl} were not symbolicated.`,
      hint:
        check?.status && check.status >= 400
          ? `The source map ${check.sourceMapUrl} returned ${check.status}; the chunk was likely built by another dev server (MF remote) or without a source map.`
          : 'The dev server could not map these frames; check `devtool` for this compilation and whether the chunk came from another server.',
      ref: bundleUrl,
    });
  }

  return result;
};
