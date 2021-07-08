import React from 'react';
import { useState } from '../../../hooks';

export function ServerLogs() {
  const {
    serverLogs: { visibleLogs },
  } = useState();

  return (
    <div className="w-full flex-grow flex flex-col">
      <h1 className="my-2 font-bold text-gray-300 text-4xl">Server Logs</h1>
      <div className="flex-grow w-full">
        {visibleLogs.map((item, i) => (
          <div key={i}>{item}</div>
        ))}
      </div>
    </div>
  );
}
