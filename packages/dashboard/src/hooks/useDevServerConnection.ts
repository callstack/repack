import { useContext } from 'react';
import { DevServerContext } from '../context/DevServerContext';

export function useDevServerConnection() {
  const { getConnection } = useContext(DevServerContext);

  return getConnection();
}
