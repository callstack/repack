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

type ProbeResult = { name: 'frame' | 'error'; value: string };

export function useSymbolicationProbe() {
  const [result, setResult] = useState<ProbeResult>();

  const probe = () => {
    symbolicateProbeError().then(
      (value) => setResult({ name: 'frame', value }),
      (error: Error) => setResult({ name: 'error', value: error.message })
    );
  };

  return { result, probe };
}
