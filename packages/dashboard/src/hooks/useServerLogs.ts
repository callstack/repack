import { useEffect, useState } from 'react';
import { fetchServerLogs } from '../utils/fetchServerLogs';

export function useServerLogs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [data, setData] = useState<any[] | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const logs = await fetchServerLogs();
        setData(logs);
      } catch (error) {
        setError(error as Error);
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return {
    loading,
    error,
    data,
  };
}
