import { useSymbolicationProbe } from '../components/SymbolicationProbe';
import ActionButton from '../ui/ActionButton';
import Report from '../ui/Report';
import Screen from '../ui/Screen';

export default function SymbolicationRoute() {
  const { result, probe } = useSymbolicationProbe();
  const symbolicated = result?.name === 'frame';

  return (
    <Screen testID="symbolication-screen">
      <ActionButton
        testID="symbolication-probe-button"
        label={symbolicated ? 'Symbolicated' : 'Symbolicate a stack trace'}
        disabled={symbolicated}
        onPress={probe}
      />
      {result && (
        <Report
          testID="symbolication-frame-report"
          name={result.name}
          value={result.value}
        />
      )}
    </Screen>
  );
}
