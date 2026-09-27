import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { describeError } from '../lib/platform'
import { Series } from '../lib/series'

export type StreamStatus = 'idle' | 'starting' | 'active' | 'error'

/**
 * Starts a data source and returns its teardown. May be async: permission
 * prompts happen here, so it must be invoked from a user gesture.
 */
export type Subscriber<R> = (
  emit: (reading: R) => void,
  fail: (error: unknown) => void,
) => (() => void) | Promise<() => void>

type Options<R> = {
  /** Map a reading to chart channels; omit to skip charting. */
  toSeries?: (reading: R) => ArrayLike<number>
  channels?: number
  capacity?: number
  /** Start on mount (only for sources that need no permission or gesture). */
  autoStart?: boolean
}

export type Stream<R> = {
  status: StreamStatus
  error?: string
  latest?: R
  series: Series
  /** Readings received since the last start. */
  count: number
  start: () => Promise<void>
  stop: () => void
}

/**
 * Shared lifecycle for every live source: start/stop, errors, a ring-buffer
 * series for charts, and React state updated at most once per animation frame.
 */
export function useStream<R>(subscribe: Subscriber<R>, options: Options<R> = {}): Stream<R> {
  const { channels = 1, capacity = 600, autoStart = false } = options
  const series = useMemo(() => new Series(capacity, channels), [capacity, channels])

  const [status, setStatus] = useState<StreamStatus>('idle')
  const [error, setError] = useState<string>()
  const [latest, setLatest] = useState<R>()
  const [count, setCount] = useState(0)

  const subscribeRef = useRef(subscribe)
  const toSeriesRef = useRef(options.toSeries)
  useEffect(() => {
    subscribeRef.current = subscribe
    toSeriesRef.current = options.toSeries
  })

  const cleanupRef = useRef<(() => void) | undefined>(undefined)
  const tokenRef = useRef(0)
  const frameRef = useRef(0)
  const fallbackRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latestRef = useRef<R | undefined>(undefined)
  const countRef = useRef(0)

  const teardown = useCallback(() => {
    tokenRef.current++
    cleanupRef.current?.()
    cleanupRef.current = undefined
    cancelAnimationFrame(frameRef.current)
    clearTimeout(fallbackRef.current)
    frameRef.current = 0
  }, [])

  const stop = useCallback(() => {
    teardown()
    setStatus('idle')
  }, [teardown])

  const start = useCallback(async () => {
    teardown()
    const token = tokenRef.current
    const live = () => token === tokenRef.current
    series.clear()
    countRef.current = 0
    latestRef.current = undefined
    setLatest(undefined)
    setCount(0)
    setError(undefined)
    setStatus('starting')

    const fail = (err: unknown) => {
      if (!live()) return
      teardown()
      setError(describeError(err))
      setStatus('error')
    }

    const emit = (reading: R) => {
      if (!live()) return
      latestRef.current = reading
      countRef.current++
      const sample = toSeriesRef.current?.(reading)
      if (sample) series.push(performance.now(), sample)
      if (!frameRef.current) {
        // Flush on the next frame, or after 250 ms when frames are paused (hidden tab).
        const flush = () => {
          cancelAnimationFrame(frameRef.current)
          clearTimeout(fallbackRef.current)
          frameRef.current = 0
          setLatest(latestRef.current)
          setCount(countRef.current)
        }
        frameRef.current = requestAnimationFrame(flush)
        fallbackRef.current = setTimeout(flush, 250)
      }
    }

    try {
      // Invoked synchronously so permission requests stay inside the user gesture.
      const cleanup = await subscribeRef.current(emit, fail)
      if (!live()) {
        cleanup()
        return
      }
      cleanupRef.current = cleanup
      setStatus('active')
    } catch (err) {
      fail(err)
    }
  }, [series, teardown])

  useEffect(() => {
    if (autoStart) void start()
    return teardown
  }, [autoStart, start, teardown])

  return { status, error, latest, series, count, start, stop }
}
