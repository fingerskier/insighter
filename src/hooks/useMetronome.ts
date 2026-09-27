import { useCallback, useEffect, useRef, useState } from 'react'
import { winx } from '../lib/platform'

const LOOKAHEAD_S = 0.1
const TICK_MS = 25

/**
 * Metronome on the Web Audio clock. A short timer loop schedules beeps slightly
 * ahead on AudioContext time, so timing stays sample-accurate even when the
 * main thread stutters. Every `accentEvery` beats is pitched up and louder.
 */
export function useMetronome(initialBpm = 100) {
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpm] = useState(initialBpm)
  const [volume, setVolume] = useState(0.6)
  const [pitch, setPitch] = useState(660)
  const [haptics, setHaptics] = useState(true)
  const [beat, setBeat] = useState(0)

  const ctxRef = useRef<AudioContext>(undefined)
  const gainRef = useRef<GainNode>(undefined)
  const nextRef = useRef(0)
  const countRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const params = useRef({ bpm, pitch, haptics, accentEvery: 4 })
  params.current = { bpm, pitch, haptics, accentEvery: 4 }

  useEffect(() => {
    const ctx = ctxRef.current
    if (ctx && gainRef.current) gainRef.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.02)
  }, [volume])

  const click = (ctx: AudioContext, at: number, accent: boolean) => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.frequency.value = params.current.pitch * (accent ? 1.5 : 1)
    env.gain.setValueAtTime(accent ? 1 : 0.6, at)
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.08)
    osc.connect(env).connect(gainRef.current!)
    osc.start(at)
    osc.stop(at + 0.09)
    osc.onended = () => osc.disconnect()
  }

  const schedule = useCallback(() => {
    const ctx = ctxRef.current!
    while (nextRef.current < ctx.currentTime + LOOKAHEAD_S) {
      const n = countRef.current
      const accent = n % params.current.accentEvery === 0
      click(ctx, nextRef.current, accent)
      // Visual/haptic cue fires when the beat is actually heard.
      const delay = Math.max(0, (nextRef.current - ctx.currentTime) * 1000)
      setTimeout(() => {
        setBeat(n)
        if (params.current.haptics) navigator.vibrate?.(accent ? 60 : 30)
      }, delay)
      nextRef.current += 60 / params.current.bpm
      countRef.current++
    }
    timerRef.current = setTimeout(schedule, TICK_MS)
  }, [])

  const start = useCallback(async () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext ?? winx().webkitAudioContext
      const ctx = new Ctx({ latencyHint: 'interactive' })
      const gain = ctx.createGain()
      gain.gain.value = volume
      gain.connect(ctx.destination)
      ctxRef.current = ctx
      gainRef.current = gain
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()
    clearTimeout(timerRef.current)
    countRef.current = 0
    nextRef.current = ctx.currentTime + 0.05
    setPlaying(true)
    schedule()
  }, [schedule, volume])

  const stop = useCallback(() => {
    clearTimeout(timerRef.current)
    setPlaying(false)
  }, [])

  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      void ctxRef.current?.close()
    },
    [],
  )

  return { playing, start, stop, bpm, setBpm, volume, setVolume, pitch, setPitch, haptics, setHaptics, beat }
}
