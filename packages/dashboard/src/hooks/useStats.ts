import { useEffect, useState, useCallback, useRef } from 'react';
import { Stats } from '../types';
import { fetchStats } from '../utils/fetchStats';

export function useStats(platform: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [data, setData] = useState<Stats | undefined>();
  const mounted = useRef(false);

  const run = useCallback(async () => {
    setLoading(true);

    try {
      const stats = await fetchStats(platform);
      if (mounted.current) {
        setData(stats);
      }
    } catch (error) {
      if (mounted.current) {
        setError(error as Error);
      }
      console.error(error);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [platform]);

  useEffect(() => {
    mounted.current = true;
    run();

    return () => {
      mounted.current = false;
    };
  }, [platform, run]);

  return {
    loading,
    error,
    data,
    refresh: run,
  };
}
