import { useRepackDevTools } from '@callstack/repack-devtools-plugin';
import { useNetworkActivityDevTools } from '@rozenite/network-activity-plugin';

export function useDevTools() {
  useRepackDevTools();
  useNetworkActivityDevTools();
}
