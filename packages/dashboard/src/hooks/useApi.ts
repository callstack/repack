import { useEffect, useState } from 'react';

type UseApi<T> =
  | {
      isLoading: true;
    }
  | {
      isLoading: false;
      data: T;
      error: undefined;
    }
  | {
      isLoading: false;
      data: undefined;
      error: Error;
    };

export function useApi<T = {}>(url: string): UseApi<T> {
  const [results, setResults] = useState<UseApi<T>>({ isLoading: true });

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${document.location.origin}${url}`);
        const body = await response.json();
        setResults({
          isLoading: false,
          data: body,
          error: undefined,
        });
      } catch (error) {
        setResults({
          isLoading: false,
          data: undefined,
          error: error as Error,
        });
      }
    })();
  }, [url]);

  return results;
}
