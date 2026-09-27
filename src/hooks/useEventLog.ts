import { useCallback, useState } from 'react'

export type LogEntry = { at: number; text: string }

/** Bounded, newest-first log for event-driven APIs. */
export function useEventLog(limit = 40) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const log = useCallback((text: string) => setEntries(prev => [{ at: Date.now(), text }, ...prev].slice(0, limit)), [limit])
  const clear = useCallback(() => setEntries([]), [])
  return { entries, log, clear }
}
