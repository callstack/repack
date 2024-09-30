import { Button } from '../ui/Button';

let enableDebugger: () => void;
let disableDebugger: () => void;

if (__DEV__) {
  const {
    default: NativeDevSettings,
  } = require('react-native/Libraries/NativeModules/specs/NativeDevSettings');
  enableDebugger = () => {
    NativeDevSettings.setIsDebuggingRemotely(true);
  };
  disableDebugger = () => {
    NativeDevSettings.setIsDebuggingRemotely(false);
  };
}

export default function DeprecatedRemoteDebuggerContainer() {
  return (
    <>
      <Button
        disabled={!__DEV__}
        title={'Open remote debugger'}
        onPress={enableDebugger}
      />
      <Button
        disabled={!__DEV__}
        title={'Close remote debugger'}
        onPress={disableDebugger}
      />
    </>
  );
}
