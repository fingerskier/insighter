import type { Subscriber } from '../hooks/useStream'
import type { Quat, Vec3 } from './math'
import {
  navx,
  permissionState,
  winx,
  type BatteryLike,
  type PermissionGatedEvent,
  type PressureRecordLike,
} from './platform'

// ---------------------------------------------------------------- Generic Sensor API

export type SensorCtorName =
  | 'Accelerometer'
  | 'LinearAccelerationSensor'
  | 'GravitySensor'
  | 'Gyroscope'
  | 'Magnetometer'
  | 'AbsoluteOrientationSensor'
  | 'RelativeOrientationSensor'
  | 'AmbientLightSensor'
  | 'AmbientTemperatureSensor'

const SENSOR_PERMISSIONS: Record<SensorCtorName, string[]> = {
  Accelerometer: ['accelerometer'],
  LinearAccelerationSensor: ['accelerometer'],
  GravitySensor: ['accelerometer'],
  Gyroscope: ['gyroscope'],
  Magnetometer: ['magnetometer'],
  AbsoluteOrientationSensor: ['accelerometer', 'gyroscope', 'magnetometer'],
  RelativeOrientationSensor: ['accelerometer', 'gyroscope'],
  AmbientLightSensor: ['ambient-light-sensor'],
  AmbientTemperatureSensor: [],
}

type AnySensor = Sensor & Record<string, unknown>

function genericSensor<R>(
  ctor: SensorCtorName,
  options: Record<string, unknown>,
  read: (sensor: AnySensor) => R,
): Subscriber<R> {
  return async (emit, fail) => {
    const Ctor = (window as unknown as Record<string, unknown>)[ctor] as
      | (new (options: Record<string, unknown>) => AnySensor)
      | undefined
    if (!Ctor) throw new Error(`${ctor} is not implemented by this browser.`)

    for (const name of SENSOR_PERMISSIONS[ctor]) {
      if ((await permissionState(name)) === 'denied') {
        throw new DOMException(`The ${name} permission is denied for this site.`, 'NotAllowedError')
      }
    }

    const sensor = new Ctor(options)
    const onReading = () => emit(read(sensor))
    const onError = (event: Event) => fail((event as SensorErrorEvent).error)
    sensor.addEventListener('reading', onReading)
    sensor.addEventListener('error', onError)
    sensor.start()
    return () => {
      sensor.removeEventListener('reading', onReading)
      sensor.removeEventListener('error', onError)
      sensor.stop()
    }
  }
}

export type VectorReading = Vec3 & { timestamp?: number }

export const vectorSensor = (ctor: SensorCtorName, frequency: number) =>
  genericSensor<VectorReading>(ctor, { frequency, referenceFrame: 'device' }, s => ({
    x: s.x as number,
    y: s.y as number,
    z: s.z as number,
    timestamp: s.timestamp ?? undefined,
  }))

export const orientationSensor = (ctor: 'AbsoluteOrientationSensor' | 'RelativeOrientationSensor', frequency: number) =>
  genericSensor<Quat>(ctor, { frequency, referenceFrame: 'device' }, s => {
    const q = s.quaternion as number[]
    return [q[0], q[1], q[2], q[3]] as const
  })

export const scalarSensor = (ctor: SensorCtorName, field: string, frequency: number) =>
  genericSensor<number>(ctor, { frequency }, s => s[field] as number)

// ---------------------------------------------------------------- DeviceMotion / DeviceOrientation

async function requestGatedPermission(target: unknown) {
  const gated = target as PermissionGatedEvent | undefined
  if (typeof gated?.requestPermission === 'function') {
    const result = await gated.requestPermission()
    if (result !== 'granted') throw new DOMException('Motion & orientation access was not granted.', 'NotAllowedError')
  }
}

export type MotionReading = {
  acceleration?: Vec3
  gravityIncluded?: Vec3
  rotationRate?: { alpha: number; beta: number; gamma: number }
  interval: number
}

const vec = (v: DeviceMotionEventAcceleration | null): Vec3 | undefined =>
  v && v.x != null ? { x: v.x ?? 0, y: v.y ?? 0, z: v.z ?? 0 } : undefined

export const deviceMotion: Subscriber<MotionReading> = async emit => {
  await requestGatedPermission(window.DeviceMotionEvent)
  const handler = (e: DeviceMotionEvent) =>
    emit({
      acceleration: vec(e.acceleration),
      gravityIncluded: vec(e.accelerationIncludingGravity),
      rotationRate: e.rotationRate?.alpha != null
        ? { alpha: e.rotationRate.alpha ?? 0, beta: e.rotationRate.beta ?? 0, gamma: e.rotationRate.gamma ?? 0 }
        : undefined,
      interval: e.interval,
    })
  window.addEventListener('devicemotion', handler)
  return () => window.removeEventListener('devicemotion', handler)
}

export type OrientationReading = {
  alpha: number | null
  beta: number | null
  gamma: number | null
  absolute: boolean
  /** iOS Safari only: degrees from magnetic north. */
  compassHeading?: number
  event: string
}

export const deviceOrientation: Subscriber<OrientationReading> = async emit => {
  await requestGatedPermission(window.DeviceOrientationEvent)
  // Chromium fires an absolute (north-referenced) variant separately.
  const type = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
  const handler = (e: Event) => {
    const o = e as DeviceOrientationEvent & { webkitCompassHeading?: number }
    emit({
      alpha: o.alpha,
      beta: o.beta,
      gamma: o.gamma,
      absolute: o.absolute,
      compassHeading: o.webkitCompassHeading,
      event: type,
    })
  }
  window.addEventListener(type, handler)
  return () => window.removeEventListener(type, handler)
}

// ---------------------------------------------------------------- Geolocation

export type GeoReading = {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  altitudeAccuracy: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

export const geolocation: Subscriber<GeoReading> = (emit, fail) => {
  const id = navigator.geolocation.watchPosition(
    ({ coords, timestamp }) =>
      emit({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude,
        altitudeAccuracy: coords.altitudeAccuracy,
        heading: coords.heading,
        speed: coords.speed,
        timestamp,
      }),
    err => {
      // Timeouts are transient while the watch keeps running.
      if (err.code !== err.TIMEOUT) fail(err)
    },
    { enableHighAccuracy: true, maximumAge: 0 },
  )
  return () => navigator.geolocation.clearWatch(id)
}

// ---------------------------------------------------------------- Microphone

export type AudioReading = {
  /** RMS level in dBFS (0 = full scale). */
  dbfs: number
  peakHz: number
  spectrum: Uint8Array
  sampleRate: number
  binHz: number
}

export const microphone: Subscriber<AudioReading> = async emit => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  const Ctx = window.AudioContext ?? winx().webkitAudioContext
  const ctx = new Ctx()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 4096
  analyser.smoothingTimeConstant = 0.6
  ctx.createMediaStreamSource(stream).connect(analyser)

  const time = new Float32Array(analyser.fftSize)
  const spectrum = new Uint8Array(analyser.frequencyBinCount)
  const binHz = ctx.sampleRate / analyser.fftSize
  let frame = 0

  const tick = () => {
    analyser.getFloatTimeDomainData(time)
    analyser.getByteFrequencyData(spectrum)
    let sum = 0
    for (let i = 0; i < time.length; i++) sum += time[i] * time[i]
    const rms = Math.sqrt(sum / time.length)
    let peak = 0
    // Skip DC and sub-audible bins when looking for the dominant frequency.
    for (let i = Math.ceil(40 / binHz); i < spectrum.length; i++) if (spectrum[i] > spectrum[peak]) peak = i
    emit({
      dbfs: Math.max(20 * Math.log10(rms || 1e-8), -100),
      peakHz: spectrum[peak] > 32 ? peak * binHz : 0,
      spectrum,
      sampleRate: ctx.sampleRate,
      binHz,
    })
    frame = requestAnimationFrame(tick)
  }
  tick()

  return () => {
    cancelAnimationFrame(frame)
    stream.getTracks().forEach(t => t.stop())
    void ctx.close()
  }
}

// ---------------------------------------------------------------- Battery, network, pressure

export type BatteryReading = Pick<BatteryLike, 'level' | 'charging' | 'chargingTime' | 'dischargingTime'>

export const battery: Subscriber<BatteryReading> = async emit => {
  const b = await navx().getBattery!()
  const read = () => emit({ level: b.level, charging: b.charging, chargingTime: b.chargingTime, dischargingTime: b.dischargingTime })
  const events = ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange']
  events.forEach(e => b.addEventListener(e, read))
  read()
  return () => events.forEach(e => b.removeEventListener(e, read))
}

export type NetworkReading = {
  online: boolean
  effectiveType?: string
  type?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  change?: string
}

export const network: Subscriber<NetworkReading> = emit => {
  const conn = navx().connection
  const read = (change?: string) =>
    emit({
      online: navigator.onLine,
      effectiveType: conn?.effectiveType,
      type: conn?.type,
      downlink: conn?.downlink,
      rtt: conn?.rtt,
      saveData: conn?.saveData,
      change,
    })
  const onOnline = () => read('online')
  const onOffline = () => read('offline')
  const onChange = () => read('change')
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  conn?.addEventListener('change', onChange)
  // The connection only fires on change; sample once a second so the chart moves.
  const timer = setInterval(() => read(), 1000)
  read()
  return () => {
    clearInterval(timer)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    conn?.removeEventListener('change', onChange)
  }
}

export const computePressure: Subscriber<PressureRecordLike> = async emit => {
  const Observer = winx().PressureObserver!
  const observer = new Observer(records => records.forEach(emit))
  await observer.observe('cpu', { sampleInterval: 1000 })
  return () => observer.disconnect()
}

// ---------------------------------------------------------------- Gamepad

export type PadSnapshot = {
  index: number
  id: string
  mapping: string
  axes: number[]
  buttons: { pressed: boolean; value: number }[]
  canRumble: boolean
}

export const gamepads: Subscriber<PadSnapshot[]> = emit => {
  let frame = 0
  let lastStamp = ''
  const poll = () => {
    const pads = navigator.getGamepads().filter((p): p is Gamepad => !!p)
    const stamp = pads.map(p => `${p.index}:${p.timestamp}`).join('|')
    if (stamp !== lastStamp) {
      lastStamp = stamp
      emit(
        pads.map(p => ({
          index: p.index,
          id: p.id,
          mapping: p.mapping,
          axes: [...p.axes],
          buttons: p.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
          canRumble: !!p.vibrationActuator,
        })),
      )
    }
    frame = requestAnimationFrame(poll)
  }
  poll()
  return () => cancelAnimationFrame(frame)
}

export const rumble = (index: number) => {
  const pad = navigator.getGamepads()[index]
  return pad?.vibrationActuator?.playEffect('dual-rumble', {
    duration: 400,
    strongMagnitude: 1,
    weakMagnitude: 0.5,
  })
}
