import { useEffect, useState } from 'react';
import { fetchStats, Stats } from '../utils/fetchStats';

export function useStats(platform: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [data, setData] = useState<Stats | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const stats = await fetchStats(platform);
        setData(stats);
      } catch (error) {
        setError(error as Error);
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [platform]);

  return {
    loading,
    error,
    data,
  };
}
