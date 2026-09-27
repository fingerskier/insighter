/**
 * Fixed-capacity ring buffer of timestamped multi-channel samples. Streams push
 * into it at sensor rate; charts read it on their own animation frame, so a
 * 60 Hz sensor never forces 60 React renders.
 */
export class Series {
  readonly capacity: number
  readonly channels: number
  private readonly times: Float64Array
  private readonly values: Float32Array
  private head = 0
  length = 0
  /** Bumped on every write so readers can skip redundant redraws. */
  version = 0

  constructor(capacity: number, channels: number) {
    this.capacity = capacity
    this.channels = channels
    this.times = new Float64Array(capacity)
    this.values = new Float32Array(capacity * channels)
  }

  push(time: number, sample: ArrayLike<number>) {
    const slot = this.head
    this.times[slot] = time
    for (let c = 0; c < this.channels; c++) {
      const v = sample[c]
      this.values[slot * this.channels + c] = v == null ? NaN : v
    }
    this.head = (this.head + 1) % this.capacity
    this.length = Math.min(this.length + 1, this.capacity)
    this.version++
  }

  clear() {
    this.head = 0
    this.length = 0
    this.version++
  }

  private slot(i: number) {
    return (this.head - this.length + i + this.capacity) % this.capacity
  }

  /** Time of the i-th sample, oldest first. */
  time(i: number) {
    return this.times[this.slot(i)]
  }

  /** Value of channel `c` of the i-th sample, oldest first. */
  value(i: number, c: number) {
    return this.values[this.slot(i) * this.channels + c]
  }

  last(c: number) {
    return this.length ? this.value(this.length - 1, c) : NaN
  }
}
