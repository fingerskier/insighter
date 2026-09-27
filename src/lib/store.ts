import { useSyncExternalStore } from 'react'

export type Store<T> = {
  get: () => T
  set: (value: T) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return
      value = next
      listeners.forEach(l => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const useStore = <T,>(store: Store<T>) => useSyncExternalStore(store.subscribe, store.get)

/** Signals shared between showcase panels (heart-rate monitor → metronome, steps → metronome). */
export const heartRateStore = createStore<number | undefined>(undefined)
export const stepCadenceStore = createStore<number | undefined>(undefined)
