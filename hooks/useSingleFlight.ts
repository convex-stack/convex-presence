import { DependencyList, useCallback, useRef } from 'react';

/**
 * Generates a function that behaves like the passed in function,
 * but only be executed one at a time. If multiple calls are requested
 * before the current call has finished, it will only execute the last one.
 * @param fn Function to be called, with only one request in flight at a time.
 * @param deps The dependencies of the function, see useCallback.
 * @returns Function that can be called whenever, returning a promise that will
 * only resolve or throw if the underlying function gets called.
 */
export default function useSingleFlight<
  F extends (...args: any[]) => Promise<any>
>(fn: F, deps: DependencyList) {
  const flightStatus = useRef({
    inFlight: false,
    upNext: null as null | { resolve: any; reject: any; args: Parameters<F> },
  });

  return useCallback((...args: Parameters<F>): ReturnType<F> => {
    if (!flightStatus.current.inFlight) {
      flightStatus.current.inFlight = true;
      const firstReq = fn(...args) as ReturnType<F>;
      (async (_) => {
        try {
          await firstReq;
        } finally {
          // If it failed, we naively just move on to the next request.
        }
        while (flightStatus.current.upNext) {
          let cur = flightStatus.current.upNext;
          flightStatus.current.upNext = null;
          await fn(...cur.args)
            .then(cur.resolve)
            .catch(cur.reject);
        }
        flightStatus.current.inFlight = false;
      })();
      return firstReq;
    }
    return new Promise((resolve, reject) => {
      flightStatus.current.upNext = { resolve, reject, args };
    }) as ReturnType<F>;
  }, deps);
}
