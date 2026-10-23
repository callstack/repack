import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  getPipelineStatus,
  readEventCounts,
  type ScriptManagerCounts,
  subscribeEventCounts,
} from '../features/runtime/events';
import Report from '../ui/Report';

const EVENT_REPORTS: Array<keyof ScriptManagerCounts> = [
  'resolving',
  'resolved',
  'prefetching',
  'loading',
  'loaded',
  'error',
  'beforeResolve',
  'resolve',
  'afterResolve',
  'beforeLoad',
  'load',
  'afterLoad',
];

const RuntimeEventsScreen = () => {
  const [counts, setCounts] = React.useState<ScriptManagerCounts>(() =>
    readEventCounts()
  );

  React.useEffect(() => subscribeEventCounts((next) => setCounts(next)), []);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View testID="runtime-events-screen" style={styles.container}>
        {EVENT_REPORTS.map((event) => (
          <Report
            key={event}
            testID={`runtime-event-${event}-report`}
            name={event}
            value={counts[event]}
          />
        ))}
        <Report
          testID="runtime-events-pipeline-report"
          name="pipeline"
          value={getPipelineStatus(counts).label}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
  },
  container: {
    paddingHorizontal: 16,
    gap: 4,
  },
});

export default RuntimeEventsScreen;
