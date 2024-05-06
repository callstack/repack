import { Button } from '../ui/Button'
// @ts-ignore
import NativeDevSettings from 'react-native/Libraries/NativeModules/specs/NativeDevSettings';


export default function DeprecatedRemoteDebuggerContainer () {
  return (
    <>
      <Button title={'Open remote debugger'} onPress={() => NativeDevSettings.setIsDebuggingRemotely(true)} />
      <Button title={'Close remote debugger'} onPress={() => NativeDevSettings.setIsDebuggingRemotely(false)} />
    </>
  )
}
