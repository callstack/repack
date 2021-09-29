import { useContext } from 'react';
import { Context } from '../context/DevServerContext/Context';

export function useDevServer() {
  return useContext(Context);
}
