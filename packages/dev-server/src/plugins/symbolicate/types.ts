/**
 * Raw React Native stack frame.
 */
export interface ReactNativeStackFrame {
  lineNumber: number | null;
  column: number | null;
  file: string | null;
  methodName: string;
}

/**
 * React Native stack frame used as input when processing by {@link Symbolicator}.
 */
export interface InputStackFrame extends ReactNativeStackFrame {
  file: string;
}

/**
 * Final symbolicated stack frame.
 */
export interface StackFrame extends InputStackFrame {
  collapse: boolean;
}

/**
 * Stack frame returned unchanged when symbolication was not attempted or
 * failed (e.g. a native frame, or a bundle whose source map is unavailable).
 * The response stack is always 1:1 with the request — React Native's LogBox
 * rejects symbolication results with a different number of frames.
 */
export type PassthroughStackFrame = ReactNativeStackFrame & {
  collapse: boolean;
};

/**
 * Represents [@babel/core-frame](https://babeljs.io/docs/en/babel-code-frame).
 */
export interface CodeFrame {
  content: string;
  location: {
    row: number;
    column: number;
  };
  fileName: string;
}

/**
 * Represents results of running {@link process} method on {@link Symbolicator} instance.
 */
export interface SymbolicatorResults {
  codeFrame: CodeFrame | null;
  stack: PassthroughStackFrame[];
}

/**
 * Delegate with implementation for symbolication functions.
 */
export interface SymbolicatorDelegate {
  /**
   * Get source code of file in the URL.
   *
   * @param fileUrl A full URL pointing to a file.
   */
  getSource: (fileUrl: string) => Promise<string | Buffer>;

  /**
   * Get source map for the file in the URL.
   *
   * @param fileUrl A full (usually `http:`) URL pointing to a compiled file.
   * The URL points to a file for which to return source map, not to the source map file itself,
   * e.g: `http://localhost:8081/index.bundle?platform=ios`.
   */
  getSourceMap: (fileUrl: string) => Promise<string | Buffer>;

  /**
   * Check if given stack frame should be included in the new symbolicated stack.
   *
   * @param frame Stack frame to check.
   */
  shouldIncludeFrame: (frame: StackFrame) => boolean;
}
