import { callMethod, getProp, readString } from '../shared/guards';
import { describeError, getStore, recordError } from './store';

/**
 * Records uncaught JS errors, then hands them to the previous global handler
 * (LogBox / RedBox) unchanged. `errorUtils` is React Native's `ErrorUtils`
 * global.
 */
export const attachGlobalErrorHandler = (errorUtils: unknown) => {
  const store = getStore();
  if (
    store.hooked.errorHandler ||
    typeof getProp(errorUtils, 'setGlobalHandler') !== 'function'
  ) {
    return false;
  }
  store.hooked.errorHandler = true;

  const previous = callMethod(errorUtils, 'getGlobalHandler', []);
  callMethod(errorUtils, 'setGlobalHandler', [
    (error: unknown, isFatal?: boolean) => {
      try {
        const described = describeError(error);
        recordError({
          source: 'global-handler',
          name: described.name,
          message: described.message,
          stack: described.stack,
          isFatal: Boolean(isFatal),
          componentStack: readString(error, 'componentStack'),
        });
      } catch {
        // never interfere with the original handler
      }
      if (typeof previous === 'function') previous(error, isFatal);
    },
  ]);
  return true;
};
