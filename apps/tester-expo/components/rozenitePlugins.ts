import {
  installRepackDevTools,
  useRepackDevTools,
} from '@callstack/repack-devtools-plugin';
import {
  useNetworkActivityDevTools,
  withOnBootNetworkActivityRecording,
} from '@rozenite/network-activity-plugin';

export function startDevTools() {
  installRepackDevTools({ boot: true });
  withOnBootNetworkActivityRecording();
}

export function useDevTools() {
  useRepackDevTools();
  useNetworkActivityDevTools();
}
