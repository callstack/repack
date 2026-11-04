import {
  useNetworkActivityDevTools,
  withOnBootNetworkActivityRecording,
} from '@rozenite/network-activity-plugin';

export function startDevTools() {
  withOnBootNetworkActivityRecording();
}

export function useDevTools() {
  useNetworkActivityDevTools();
}
