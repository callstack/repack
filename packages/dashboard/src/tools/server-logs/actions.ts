import { Context } from 'overmind';

export const incrementOffset = ({ state }: Context) => {
  if (state.serverLogs.offset < state.serverLogs.maxOffset) {
    state.serverLogs.offset += 1;
  }
};
