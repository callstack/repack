import { useState } from 'react';
import parseErrorStack from 'react-native/Libraries/Core/Devtools/parseErrorStack';
import symbolicateStackTrace from 'react-native/Libraries/Core/Devtools/symbolicateStackTrace';

function throwSymbolicationProbeError() {
  throw new Error('EXPO_SYMBOLICATION_SENTINEL');
}

async function symbolicateProbeError() {
  try {
    throwSymbolicationProbeError();
  } catch (error) {
    const { stack } = await symbolicateStackTrace(
      parseErrorStack((error as Error).stack)
    );
    return `${stack[0].file}:${stack[0].lineNumber}`;
  }
  return 'nothing thrown';
}

export function useSymbolicationProbe() {
  const [frame, setFrame] = useState<string>();

  const probe = () => {
    symbolicateProbeError().then(setFrame, (error: Error) =>
      setFrame(`failed: ${error.message}`)
    );
  };

  return { frame, probe };
}
