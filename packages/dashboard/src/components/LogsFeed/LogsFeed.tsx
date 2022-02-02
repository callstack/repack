import * as React from 'react';
import { LogEntry } from './LogEntry';

export function LogsFeed() {
  return (
    <>
      <LogEntry
        value={{
          type: 'info',
          timestamp: Date.now(),
          issuer: 'DevServerProxy',
          data: [1, 'hello', true, { prop: true }],
        }}
      />
      <LogEntry
        value={{
          type: 'error',
          timestamp: Date.now(),
          issuer: 'DevServerProxy',
          message: 'Dashboard client connected',
          data: {
            clientId: 'client#1',
            clientId2: 'client#1',
            clientId3: 'client#1',
            clientId4: 'client#1',
          },
        }}
      />
    </>
  );
}
