import { derived } from 'overmind';

interface ServerLogsState {
  logs: string[];
  visibleLogs: string[];
  size: number;
  offset: number;
  maxOffset: number;
}

export const state: ServerLogsState = {
  logs: new Array(950).fill(true).map((_, i) => `${i}`),
  visibleLogs: derived((state: ServerLogsState) =>
    state.logs.slice(-(state.offset + 1) * state.size)
  ),
  size: 100,
  offset: 0,
  maxOffset: derived((state: ServerLogsState) =>
    Math.floor(state.logs.length / state.size)
  ),
};
