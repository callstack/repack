import * as React from 'react';
import Observable from 'zen-observable';
import { DevServerContext } from '../../types';

export const Context = React.createContext<DevServerContext>({
  getPlatforms: () => [],
  getProxyConnection: () => Observable.of(),
  getCompilerConnection: () => Observable.of(),
});
