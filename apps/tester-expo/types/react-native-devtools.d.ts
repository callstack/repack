declare module 'react-native/Libraries/Core/Devtools/parseErrorStack' {
  export type StackFrame = {
    file?: string;
    lineNumber?: number;
    column?: number;
    methodName: string;
  };

  export default function parseErrorStack(errorStack?: string): StackFrame[];
}

declare module 'react-native/Libraries/Core/Devtools/symbolicateStackTrace' {
  import type { StackFrame } from 'react-native/Libraries/Core/Devtools/parseErrorStack';

  export default function symbolicateStackTrace(
    stack: StackFrame[]
  ): Promise<{ stack: StackFrame[] }>;
}
