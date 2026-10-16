import { Button } from 'react-native';

declare global {
  var __REPACK_ANDROID_SYMBOLICATION_STACK__: string | undefined;
}

function throwSymbolicationProbeError() {
  throw new Error('EXPO_ANDROID_SYMBOLICATION_SENTINEL');
}

function captureSymbolicationStack() {
  try {
    throwSymbolicationProbeError();
  } catch (error) {
    globalThis.__REPACK_ANDROID_SYMBOLICATION_STACK__ =
      error instanceof Error ? error.stack : undefined;
  }
}

export default function SymbolicationProbe() {
  return (
    <Button
      testID="symbolication-probe"
      title="Capture symbolication stack"
      onPress={captureSymbolicationStack}
    />
  );
}
