import { useCallback, useState } from 'react'

/** State mirrored to localStorage; falls back to memory when storage is unavailable. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`insighter:${key}`)
      return raw == null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue(prev => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          localStorage.setItem(`insighter:${key}`, JSON.stringify(resolved))
        } catch {
          // Private mode or quota: keep the in-memory value.
        }
        return resolved
      })
    },
    [key],
  )
  return [value, set] as const
}
