import { useMemo, useState } from 'react'
import { Panel, Segmented, Stat, StatGrid, StreamControls } from '../components/ui'
import { TimeSeries } from '../components/viz/TimeSeries'
import { Compass, DeviceModel, SpiritLevel } from '../components/viz/Viz'
import { useStream } from '../hooks/useStream'
import { eulerToQuat, fmt, headingFromMagnetometer, magnitude, quatToEuler, type Quat } from '../lib/math'
import {
  deviceMotion,
  deviceOrientation,
  orientationSensor,
  vectorSensor,
  type MotionReading,
  type OrientationReading,
  type SensorCtorName,
  type VectorReading,
} from '../lib/sources'

const RATES = [
  { value: 10, label: '10 Hz' },
  { value: 30, label: '30 Hz' },
  { value: 60, label: '60 Hz' },
]

type VectorConfig = {
  id: string
  ctor: SensorCtorName
  unit: string
  digits: number
  extra?: 'level' | 'compass'
}

/** One card for each three-axis Generic Sensor: live x/y/z, magnitude and a chart. */
export function VectorSensorPanel({ id, ctor, unit, digits, extra }: VectorConfig) {
  const [rate, setRate] = useState(30)
  const subscribe = useMemo(() => vectorSensor(ctor, rate), [ctor, rate])
  const stream = useStream<VectorReading>(subscribe, {
    channels: 4,
    toSeries: r => [r.x, r.y, r.z, magnitude(r)],
  })
  const r = stream.latest
  const live = stream.status === 'active' || stream.status === 'starting'

  return (
    <Panel id={id}>
      <StreamControls stream={stream}>
        <Segmented label="Sample rate" value={rate} options={RATES} onChange={v => { setRate(v); if (live) stream.stop() }} />
      </StreamControls>
      {r && (
        <>
          <div className={extra ? 'split' : undefined}>
            <StatGrid>
              <Stat label="x" value={fmt(r.x, digits)} unit={unit} />
              <Stat label="y" value={fmt(r.y, digits)} unit={unit} />
              <Stat label="z" value={fmt(r.z, digits)} unit={unit} />
              <Stat label="|v|" value={fmt(magnitude(r), digits)} unit={unit} hint="Vector magnitude" />
            </StatGrid>
            {extra === 'level' && <SpiritLevel x={r.x} y={r.y} />}
            {extra === 'compass' && <Compass heading={headingFromMagnetometer(r.x, r.y)} caption="Hold flat. Raw field, not tilt-compensated." />}
          </div>
          <TimeSeries series={stream.series} labels={['x', 'y', 'z', '|v|']} unit={unit} symmetric digits={digits} />
        </>
      )}
    </Panel>
  )
}

export function OrientationSensorPanel({ id, ctor }: { id: string; ctor: 'AbsoluteOrientationSensor' | 'RelativeOrientationSensor' }) {
  const subscribe = useMemo(() => orientationSensor(ctor, 60), [ctor])
  const stream = useStream<Quat>(subscribe, {
    channels: 3,
    toSeries: q => {
      const e = quatToEuler(q)
      return [e.yaw, e.pitch, e.roll]
    },
  })
  const q = stream.latest
  const e = q && quatToEuler(q)
  return (
    <Panel id={id}>
      <StreamControls stream={stream} />
      {q && e && (
        <>
          <div className="split">
            <DeviceModel quaternion={q} />
            <StatGrid>
              <Stat label="yaw" value={fmt(e.yaw, 1)} unit="°" />
              <Stat label="pitch" value={fmt(e.pitch, 1)} unit="°" />
              <Stat label="roll" value={fmt(e.roll, 1)} unit="°" />
              <Stat label="quaternion" value={<span className="mono small">{q.map(v => v.toFixed(3)).join(' ')}</span>} hint="x y z w" />
            </StatGrid>
          </div>
          <TimeSeries series={stream.series} labels={['yaw', 'pitch', 'roll']} unit="°" min={-180} max={180} digits={1} />
        </>
      )}
    </Panel>
  )
}

export function DeviceMotionPanel() {
  const stream = useStream<MotionReading>(deviceMotion, {
    channels: 3,
    toSeries: r => {
      const a = r.acceleration
      return a ? [a.x, a.y, a.z] : [NaN, NaN, NaN]
    },
  })
  const r = stream.latest
  const g = r?.gravityIncluded
  return (
    <Panel id="device-motion" wide>
      <StreamControls stream={stream} waiting="Listening. Desktop browsers often expose the event but never fire it.">
      </StreamControls>
      {r && (
        <>
          <div className="split">
            <div className="stack">
              <h4>Acceleration (gravity removed)</h4>
              <StatGrid>
                <Stat label="x" value={fmt(r.acceleration?.x)} unit="m/s²" />
                <Stat label="y" value={fmt(r.acceleration?.y)} unit="m/s²" />
                <Stat label="z" value={fmt(r.acceleration?.z)} unit="m/s²" />
              </StatGrid>
              <h4>Rotation rate</h4>
              <StatGrid>
                <Stat label="alpha (z)" value={fmt(r.rotationRate?.alpha, 1)} unit="°/s" />
                <Stat label="beta (x)" value={fmt(r.rotationRate?.beta, 1)} unit="°/s" />
                <Stat label="gamma (y)" value={fmt(r.rotationRate?.gamma, 1)} unit="°/s" />
                <Stat label="interval" value={fmt(r.interval, 0)} unit="ms" />
              </StatGrid>
            </div>
            {g && (
              <div className="stack center">
                <SpiritLevel x={g.x} y={g.y} />
                <span className="caption">Spirit level from accelerationIncludingGravity</span>
              </div>
            )}
          </div>
          <TimeSeries series={stream.series} labels={['x', 'y', 'z']} unit="m/s²" symmetric />
        </>
      )}
    </Panel>
  )
}

export function DeviceOrientationPanel() {
  const stream = useStream<OrientationReading>(deviceOrientation, {
    channels: 3,
    toSeries: r => [r.alpha ?? NaN, r.beta ?? NaN, r.gamma ?? NaN],
  })
  const r = stream.latest
  const hasAngles = r && r.alpha != null
  const heading = r?.compassHeading ?? (r?.absolute && r.alpha != null ? (360 - r.alpha) % 360 : undefined)
  return (
    <Panel id="device-orientation" wide>
      <StreamControls stream={stream} waiting="Listening. Desktop browsers often expose the event but never fire it." />
      {r && !hasAngles && <p className="note">Events are arriving with null angles, so this device has no orientation hardware.</p>}
      {r && hasAngles && (
        <>
          <div className="split three">
            <DeviceModel quaternion={eulerToQuat(r.alpha!, r.beta!, r.gamma!)} />
            <StatGrid>
              <Stat label="alpha (z)" value={fmt(r.alpha, 1)} unit="°" />
              <Stat label="beta (x)" value={fmt(r.beta, 1)} unit="°" />
              <Stat label="gamma (y)" value={fmt(r.gamma, 1)} unit="°" />
              <Stat label="reference" value={r.absolute ? 'Earth' : 'arbitrary'} hint={r.event} />
            </StatGrid>
            <Compass heading={heading} caption={heading == null ? 'Needs an absolute (north-referenced) source' : r.compassHeading != null ? 'webkitCompassHeading' : 'From absolute alpha'} />
          </div>
          <TimeSeries series={stream.series} labels={['α', 'β', 'γ']} unit="°" min={-180} max={360} digits={1} />
        </>
      )}
    </Panel>
  )
}

export function MotionSection() {
  return (
    <>
      <DeviceOrientationPanel />
      <DeviceMotionPanel />
      <VectorSensorPanel id="accelerometer" ctor="Accelerometer" unit="m/s²" digits={2} extra="level" />
      <VectorSensorPanel id="linear-acceleration" ctor="LinearAccelerationSensor" unit="m/s²" digits={2} />
      <VectorSensorPanel id="gravity" ctor="GravitySensor" unit="m/s²" digits={2} extra="level" />
      <VectorSensorPanel id="gyroscope" ctor="Gyroscope" unit="rad/s" digits={3} />
      <VectorSensorPanel id="magnetometer" ctor="Magnetometer" unit="µT" digits={1} extra="compass" />
      <OrientationSensorPanel id="absolute-orientation" ctor="AbsoluteOrientationSensor" />
      <OrientationSensorPanel id="relative-orientation" ctor="RelativeOrientationSensor" />
    </>
  )
}
