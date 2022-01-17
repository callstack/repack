import { useActor, useMachine } from '@xstate/react';
import * as React from 'react';
import { Interpreter } from 'xstate';
import { RootContext, RootEvents, rootMachine } from '../machines/root';

export interface RootMachineContextType {
  rootMachine?: Interpreter<RootContext, any, RootEvents>;
}

export const RootMachineContext = React.createContext<RootMachineContextType>(
  {}
);

export function RootMachineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, , service] = useMachine(rootMachine, {
    devTools: process.env.NODE_ENV === 'development',
  });

  return (
    <RootMachineContext.Provider
      value={React.useMemo(() => ({ rootMachine: service }), [service])}
    >
      {children}
    </RootMachineContext.Provider>
  );
}

export function useRootService() {
  const { rootMachine } = React.useContext(RootMachineContext);
  if (!rootMachine) {
    throw new Error('Missing root machine');
  }

  return useActor(rootMachine);
}
