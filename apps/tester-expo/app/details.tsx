import Constants from 'expo-constants';
import Report from '../ui/Report';
import Screen from '../ui/Screen';

export default function DetailsRoute() {
  return (
    <Screen testID="expo-module-screen">
      <Report
        testID="expo-module-app-name-report"
        name="app name"
        value={Constants.expoConfig?.name ?? 'missing'}
      />
    </Screen>
  );
}
