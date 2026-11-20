import { useSyncExternalStore } from 'react';

export interface Store<S> {
  getState: () => S;
  setState: (patch: Partial<S> | ((state: S) => Partial<S>)) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Minimal external store (Zustand-compatible shape) without adding a dependency. */
export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (patch) => {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Selectors must return primitives or stable references, never freshly built objects. */
export function useStore<S, T>(store: Store<S>, selector: (state: S) => T): T {
  const read = () => selector(store.getState());
  return useSyncExternalStore(store.subscribe, read, read);
}
