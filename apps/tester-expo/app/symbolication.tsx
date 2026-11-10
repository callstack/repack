import { useSymbolicationProbe } from '../components/SymbolicationProbe';
import ActionButton from '../ui/ActionButton';
import Report from '../ui/Report';
import Screen from '../ui/Screen';

export default function SymbolicationRoute() {
  const { frame, probe } = useSymbolicationProbe();

  return (
    <Screen testID="symbolication-screen">
      <ActionButton
        testID="symbolication-probe-button"
        label={frame ? 'Symbolicated' : 'Symbolicate a stack trace'}
        disabled={frame !== undefined}
        onPress={probe}
      />
      {frame && (
        <Report
          testID="symbolication-frame-report"
          name="frame"
          value={frame}
        />
      )}
    </Screen>
  );
}
