/**
 * Step detection on the acceleration magnitude (gravity included, so it works
 * in any pocket orientation). A fast low-pass tracks the signal, a slow one
 * tracks its baseline, and a step is a rise of `threshold` above baseline.
 * It re-arms only after the signal falls back below baseline, with a
 * refractory period that caps the rate at about 4 steps/s.
 */
export class StepDetector {
  steps = 0
  private fast = 9.81
  private slow = 9.81
  private armed = true
  private last = -Infinity
  private readonly recent: number[] = []

  constructor(private readonly threshold = 1.2, private readonly refractoryMs = 250) {}

  /** Feed one sample; returns true when it completes a step. */
  push(magnitude: number, timeMs: number): boolean {
    this.fast += (magnitude - this.fast) * 0.3
    this.slow += (magnitude - this.slow) * 0.02
    const lift = this.fast - this.slow
    if (lift < 0) this.armed = true
    if (this.armed && lift > this.threshold && timeMs - this.last > this.refractoryMs) {
      this.armed = false
      this.last = timeMs
      this.steps++
      this.recent.push(timeMs)
      if (this.recent.length > 40) this.recent.shift()
      return true
    }
    return false
  }

  /** Steps per minute over the last `windowMs`; undefined until there are 4 steps in the window. */
  cadence(nowMs: number, windowMs = 10_000): number | undefined {
    const inWindow = this.recent.filter(t => nowMs - t <= windowMs)
    if (inWindow.length < 4) return undefined
    const span = inWindow[inWindow.length - 1] - inWindow[0]
    return span > 0 ? ((inWindow.length - 1) / span) * 60_000 : undefined
  }

  reset() {
    this.steps = 0
    this.recent.length = 0
    this.last = -Infinity
  }
}
