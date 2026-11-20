import { useCallback, useState } from 'react';
import { errorMessage } from '../services/workspace/httpClient';

export interface AsyncAction<Args extends unknown[], R> {
  run: (...args: Args) => Promise<R | undefined>;
  pending: boolean;
  error: string | null;
  clearError: () => void;
}

/** Wraps a mutation with pending and error state; failures resolve to undefined. */
export function useAsyncAction<Args extends unknown[], R>(
  action: (...args: Args) => Promise<R>
): AsyncAction<Args, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<R | undefined> => {
      setPending(true);
      setError(null);
      try {
        return await action(...args);
      } catch (err) {
        setError(errorMessage(err));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [action]
  );

  return { run, pending, error, clearError: () => setError(null) };
}
