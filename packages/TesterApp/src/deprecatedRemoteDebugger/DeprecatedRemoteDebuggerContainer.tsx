import React from 'react';
import { Button } from '../ui/Button';

let enableRemoteDebugger = () => {};
let disableRemoteDebugger = () => {};

if (__DEV__) {
  const {
    default: NativeDevSettings,
  } = require('react-native/Libraries/NativeModules/specs/NativeDevSettings');
  enableRemoteDebugger = () => NativeDevSettings.setIsDebuggingRemotely(true);
  disableRemoteDebugger = () => NativeDevSettings.setIsDebuggingRemotely(false);
}

export default function DeprecatedRemoteDebuggerContainer() {
  return (
    <>
      <Button
        disabled={!__DEV__}
        title={'Open remote debugger'}
        onPress={enableRemoteDebugger}
      />
      <Button
        disabled={!__DEV__}
        title={'Close remote debugger'}
        onPress={disableRemoteDebugger}
      />
    </>
  );
}
