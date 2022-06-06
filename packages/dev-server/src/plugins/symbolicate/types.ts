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
  stack: StackFrame[];
}

/**
 * Symbolicator delegate required by {@link Symbolicator}.
 */
export interface SymbolicatorDelegate {
  getSource: (fileUrl: string) => Promise<string | Buffer>;
  getSourceMap: (fileUrl: string) => Promise<string | Buffer>;
  shouldIncludeFrame: (frame: StackFrame) => boolean;
}
