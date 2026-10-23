import type { PromiseState } from '../shared/types';
import { describeError } from './store';

type Tracked = { state: PromiseState; error?: string; since: number };

const tracked = new WeakMap<object, Tracked>();

/**
 * Observes a promise's outcome without changing it. The derived promise
 * handles rejections, so tracking never adds an unhandled rejection.
 */
export const trackPromise = (promise: unknown, now = Date.now()) => {
  if (!(promise instanceof Promise)) return undefined;
  const existing = tracked.get(promise);
  if (existing) return existing;
  const entry: Tracked = { state: 'pending', since: now };
  tracked.set(promise, entry);
  promise.then(
    () => {
      entry.state = 'fulfilled';
    },
    (error: unknown) => {
      entry.state = 'rejected';
      entry.error = describeError(error).message;
    }
  );
  return entry;
};

export const getPromiseState = (promise: unknown): Tracked | undefined =>
  promise instanceof Promise ? tracked.get(promise) : undefined;

/** Lets callbacks of already-settled tracked promises run. */
export const flushPromiseStates = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));
