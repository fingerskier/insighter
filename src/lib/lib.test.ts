import { describe, expect, it } from 'vitest'
import { parseHeartRate } from './heartRate'
import {
  eulerToQuat,
  frequencyToNote,
  haversine,
  headingFromMagnetometer,
  quatToCssMatrix,
  quatToEuler,
  toLocalMetres,
} from './math'
import { Series } from './series'
import { StepDetector } from './steps'

describe('orientation math', () => {
  it('identity attitude is zero Euler angles and an identity matrix', () => {
    expect(eulerToQuat(0, 0, 0)).toEqual([0, 0, 0, 1])
    expect(quatToCssMatrix([0, 0, 0, 1])).toBe('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)')
  })

  it('round-trips yaw, pitch and roll through a quaternion', () => {
    const e = quatToEuler(eulerToQuat(30, 20, -10))
    expect(e.yaw).toBeCloseTo(30, 6)
    expect(e.pitch).toBeCloseTo(20, 6)
    expect(e.roll).toBeCloseTo(-10, 6)
  })

  it('flips y into CSS space: +90° about device z turns screen-right into screen-up', () => {
    // matrix3d is column-major; the first column is where the x unit vector lands.
    const values = quatToCssMatrix(eulerToQuat(90, 0, 0)).slice(9, -1).split(',').map(Number)
    expect(values[0]).toBeCloseTo(0)
    expect(values[1]).toBeCloseTo(-1) // CSS y is down, so up is -1
  })
})

describe('magnetometer heading', () => {
  it('reads north when the field points along +y', () => expect(headingFromMagnetometer(0, 30)).toBeCloseTo(0))
  it('reads east when north is to the device’s left', () => expect(headingFromMagnetometer(-30, 0)).toBeCloseTo(90))
  it('reads west when north is to the device’s right', () => expect(headingFromMagnetometer(30, 0)).toBeCloseTo(270))
})

describe('geodesy', () => {
  it('measures one degree of latitude as about 111 km', () => {
    expect(haversine({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111_195, -1)
  })
  it('projects to local metres, north up', () => {
    const p = toLocalMetres({ latitude: 40, longitude: -90 }, { latitude: 40.001, longitude: -90 })
    expect(p.east).toBeCloseTo(0)
    expect(p.north).toBeCloseTo(111.2, 0)
  })
})

describe('frequencyToNote', () => {
  it('names concert A and middle C', () => {
    expect(frequencyToNote(440)).toEqual({ name: 'A', octave: 4, cents: 0 })
    expect(frequencyToNote(261.63)).toMatchObject({ name: 'C', octave: 4 })
  })
  it('ignores silence', () => expect(frequencyToNote(0)).toBeUndefined())
})

describe('Series', () => {
  it('keeps the newest samples in order once full', () => {
    const s = new Series(3, 2)
    for (let i = 0; i < 5; i++) s.push(i, [i, i * 10])
    expect(s.length).toBe(3)
    expect([0, 1, 2].map(i => s.time(i))).toEqual([2, 3, 4])
    expect(s.value(2, 1)).toBe(40)
    expect(s.last(0)).toBe(4)
  })
  it('stores missing channels as NaN', () => {
    const s = new Series(2, 2)
    s.push(0, [1])
    expect(s.value(0, 1)).toBeNaN()
  })
})

describe('StepDetector', () => {
  /** Walking at `spm` steps/min: gravity plus a 3 m/s² bump per step, sampled at 60 Hz. */
  function walk(detector: StepDetector, spm: number, seconds: number) {
    const period = 60_000 / spm
    for (let t = 0; t < seconds * 1000; t += 1000 / 60) {
      const phase = (t % period) / period
      detector.push(9.81 + 3 * Math.sin(phase * 2 * Math.PI), t)
    }
    return seconds * 1000
  }

  it('counts one step per stride and reports cadence', () => {
    const d = new StepDetector()
    const end = walk(d, 120, 20)
    expect(d.steps).toBeGreaterThanOrEqual(38)
    expect(d.steps).toBeLessThanOrEqual(40)
    expect(d.cadence(end)).toBeCloseTo(120, -1)
  })

  it('ignores a phone lying still', () => {
    const d = new StepDetector()
    for (let t = 0; t < 10_000; t += 16) d.push(9.81 + (Math.random() - 0.5) * 0.2, t)
    expect(d.steps).toBe(0)
    expect(d.cadence(10_000)).toBeUndefined()
  })
})

describe('parseHeartRate', () => {
  const view = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer)

  it('reads an 8-bit BPM', () => {
    expect(parseHeartRate(view(0x00, 72))).toMatchObject({ bpm: 72, rr: [] })
  })

  it('reads a 16-bit BPM, contact, energy and RR intervals', () => {
    // flags: uint16 | contact supported+detected | energy | RR
    const s = parseHeartRate(view(0x1f, 0x2c, 0x01, 0x10, 0x00, 0x00, 0x04, 0x00, 0x02))
    expect(s.bpm).toBe(300)
    expect(s.contact).toBe(true)
    expect(s.energy).toBe(16)
    expect(s.rr).toEqual([1000, 500])
  })
})
