import { useState } from 'react';
import FastRefreshLeaf from '../components/FastRefreshLeaf';
import ActionButton from '../ui/ActionButton';
import Report from '../ui/Report';
import Screen from '../ui/Screen';

export default function FastRefreshRoute() {
  const [count, setCount] = useState(0);

  return (
    <Screen testID="fast-refresh-screen">
      <Report
        testID="fast-refresh-state-report"
        name="parent state"
        value={count}
      />
      <ActionButton
        testID="fast-refresh-increment-button"
        label="Increment"
        onPress={() => setCount((value) => value + 1)}
      />
      <FastRefreshLeaf />
    </Screen>
  );
}
