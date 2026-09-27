import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorNote, Panel, Stat, StatGrid, StreamControls } from '../components/ui'
import { TimeSeries } from '../components/viz/TimeSeries'
import { Meter, Spectrum, Track } from '../components/viz/Viz'
import { useStream } from '../hooks/useStream'
import { fmt, frequencyToNote, haversine, toLocalMetres } from '../lib/math'
import { describeError, type PressureRecordLike } from '../lib/platform'
import { computePressure, geolocation, microphone, scalarSensor, type AudioReading, type GeoReading } from '../lib/sources'

// ---------------------------------------------------------------- Environment

export function AmbientLightPanel() {
  const subscribe = useMemo(() => scalarSensor('AmbientLightSensor', 'illuminance', 5), [])
  const stream = useStream<number>(subscribe, { channels: 1, toSeries: v => [v] })
  const lux = stream.latest
  const scene = lux == null ? '' : lux < 1 ? 'Darkness' : lux < 50 ? 'Dim room' : lux < 500 ? 'Indoor lighting' : lux < 10_000 ? 'Overcast daylight' : 'Direct sunlight'
  return (
    <Panel id="ambient-light">
      <StreamControls stream={stream} />
      {lux != null && (
        <>
          <Meter label={scene} value={lux} min={1} max={100_000} log unit="lx" />
          <TimeSeries series={stream.series} labels={['illuminance']} unit="lx" min={0} digits={0} />
        </>
      )}
    </Panel>
  )
}

export function AmbientTemperaturePanel() {
  const subscribe = useMemo(() => scalarSensor('AmbientTemperatureSensor', 'temperature', 1), [])
  const stream = useStream<number>(subscribe, { toSeries: v => [v] })
  return (
    <Panel id="ambient-temperature">
      <StreamControls stream={stream} />
      {stream.latest != null && <StatGrid><Stat label="temperature" value={fmt(stream.latest, 1)} unit="°C" /></StatGrid>}
    </Panel>
  )
}

const PRESSURE_LEVELS = ['nominal', 'fair', 'serious', 'critical'] as const

export function ComputePressurePanel() {
  const stream = useStream<PressureRecordLike>(computePressure, {
    toSeries: r => [PRESSURE_LEVELS.indexOf(r.state)],
  })
  const state = stream.latest?.state
  return (
    <Panel id="pressure">
      <StreamControls stream={stream} waiting="Observing. The browser reports only when pressure changes." />
      {state && (
        <>
          <ol className="pressure-scale" aria-label="CPU pressure">
            {PRESSURE_LEVELS.map(l => (
              <li key={l} className={`${l === state ? 'on ' : ''}p-${l}`}>{l}</li>
            ))}
          </ol>
          <TimeSeries series={stream.series} labels={['level']} min={0} max={3} digits={0} height={80} windowMs={60_000} />
          <p className="caption">0 nominal · 1 fair · 2 serious · 3 critical</p>
        </>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- Location

export function GeolocationPanel() {
  const [track, setTrack] = useState<GeoReading[]>([])
  const stream = useStream<GeoReading>(geolocation, {
    channels: 2,
    toSeries: r => [r.speed ?? NaN, r.accuracy],
  })
  useEffect(() => {
    const fix = stream.latest
    if (fix) setTrack(t => (t.length && t[t.length - 1].timestamp === fix.timestamp ? t : [...t.slice(-499), fix]))
  }, [stream.latest])
  useEffect(() => {
    if (stream.status === 'starting') setTrack([])
  }, [stream.status])

  const r = stream.latest
  const distance = useMemo(() => track.reduce((sum, p, i) => (i ? sum + haversine(track[i - 1], p) : 0), 0), [track])
  const points = useMemo(() => (track.length ? track.map(p => toLocalMetres(track[0], p)) : []), [track])

  return (
    <Panel id="geolocation" wide>
      <StreamControls stream={stream} startLabel="Start tracking" waiting="Waiting for a first fix…" />
      {r && (
        <div className="split">
          <div className="stack">
            <StatGrid>
              <Stat label="latitude" value={fmt(r.latitude, 6)} unit="°" />
              <Stat label="longitude" value={fmt(r.longitude, 6)} unit="°" />
              <Stat label="accuracy" value={`±${fmt(r.accuracy, 0)}`} unit="m" />
              <Stat label="altitude" value={fmt(r.altitude, 1)} unit="m" hint={r.altitudeAccuracy != null ? `±${fmt(r.altitudeAccuracy, 0)} m` : undefined} />
              <Stat label="speed" value={fmt(r.speed, 1)} unit="m/s" />
              <Stat label="heading" value={fmt(r.heading, 0)} unit="°" />
              <Stat label="fixes" value={track.length} />
              <Stat label="distance" value={fmt(distance, 0)} unit="m" />
            </StatGrid>
            <a className="link" href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=17/${r.latitude}/${r.longitude}`} target="_blank" rel="noreferrer">
              Open in OpenStreetMap ↗
            </a>
          </div>
          <Track points={points} accuracy={r.accuracy} />
        </div>
      )}
      {r && <TimeSeries series={stream.series} labels={['speed (m/s)', 'accuracy (m)']} min={0} windowMs={120_000} digits={1} />}
    </Panel>
  )
}

// ---------------------------------------------------------------- Media

export function MicrophonePanel() {
  const stream = useStream<AudioReading>(microphone, { channels: 1, capacity: 900, toSeries: r => [r.dbfs] })
  const r = stream.latest
  const note = r && frequencyToNote(r.peakHz)
  return (
    <Panel id="microphone" wide>
      <StreamControls stream={stream} startLabel="Start listening" />
      {r && (
        <>
          <div className="split">
            <Meter label="Level (dBFS, relative to full scale)" value={r.dbfs} min={-100} max={0} unit="dB" digits={1} />
            <StatGrid>
              <Stat label="dominant" value={r.peakHz ? fmt(r.peakHz, 0) : '—'} unit="Hz" />
              <Stat label="note" value={note ? `${note.name}${note.octave}` : '—'} hint={note ? `${note.cents >= 0 ? '+' : ''}${note.cents} cents` : undefined} />
              <Stat label="sample rate" value={(r.sampleRate / 1000).toFixed(1)} unit="kHz" />
            </StatGrid>
          </div>
          <Spectrum data={r.spectrum} binHz={r.binHz} version={stream.count} />
          <TimeSeries series={stream.series} labels={['level']} unit="dBFS" min={-100} max={0} digits={1} height={90} />
        </>
      )}
    </Panel>
  )
}

type CameraState = {
  stream: MediaStream
  settings: MediaTrackSettings
  capabilities: Partial<MediaTrackCapabilities> & { torch?: boolean }
  label: string
}

export function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cam, setCam] = useState<CameraState>()
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string>()
  const [torch, setTorch] = useState(false)
  const [brightness, setBrightness] = useState<number>()
  const [error, setError] = useState<string>()

  const stop = useCallback(() => {
    setCam(prev => {
      prev?.stream.getTracks().forEach(t => t.stop())
      return undefined
    })
    setTorch(false)
    setBrightness(undefined)
  }, [])

  const start = async (id?: string) => {
    setError(undefined)
    try {
      cam?.stream.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: id ? { deviceId: { exact: id } } : { facingMode: 'environment' },
      })
      const track = stream.getVideoTracks()[0]
      setCam({
        stream,
        settings: track.getSettings(),
        capabilities: track.getCapabilities?.() ?? {},
        label: track.label,
      })
      setDeviceId(track.getSettings().deviceId)
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices(all.filter(d => d.kind === 'videoinput'))
    } catch (err) {
      setError(describeError(err))
    }
  }

  useEffect(() => {
    if (videoRef.current && cam) videoRef.current.srcObject = cam.stream
  }, [cam])
  useEffect(() => stop, [stop])

  // Camera as a light sensor: mean luma of a downscaled frame, twice a second.
  useEffect(() => {
    if (!cam) return
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 24
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const timer = setInterval(() => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let sum = 0
      for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      setBrightness((sum / (data.length / 4) / 255) * 100)
    }, 500)
    return () => clearInterval(timer)
  }, [cam])

  const toggleTorch = async () => {
    const track = cam?.stream.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] })
      setTorch(!torch)
    } catch (err) {
      setError(describeError(err))
    }
  }

  const s = cam?.settings
  return (
    <Panel id="camera" wide>
      <div className="controls">
        <div className="controls-row">
          {cam ? <button className="btn" onClick={stop}>Stop</button> : <button className="btn primary" onClick={() => void start()}>Start camera</button>}
          {devices.length > 1 && (
            <select value={deviceId} onChange={e => void start(e.target.value)} aria-label="Camera">
              {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
            </select>
          )}
          {cam?.capabilities.torch && <button className={`btn${torch ? ' primary' : ''}`} onClick={toggleTorch}>Torch {torch ? 'on' : 'off'}</button>}
        </div>
        <ErrorNote error={error} />
      </div>
      {cam && s && (
        <div className="split">
          <video ref={videoRef} className="camera" autoPlay playsInline muted />
          <div className="stack">
            <StatGrid>
              <Stat label="resolution" value={`${s.width}×${s.height}`} />
              <Stat label="frame rate" value={fmt(s.frameRate, 0)} unit="fps" />
              <Stat label="facing" value={s.facingMode ?? '—'} />
              <Stat label="aspect" value={fmt(s.aspectRatio, 2)} />
            </StatGrid>
            <Meter label="Scene brightness (camera as a light sensor)" value={brightness} min={0} max={100} unit="%" />
            <details>
              <summary>Track capabilities</summary>
              <pre className="json">{JSON.stringify(cam.capabilities, null, 1)}</pre>
            </details>
            <p className="caption">{cam.label}</p>
          </div>
        </div>
      )}
    </Panel>
  )
}

export function MediaDevicesPanel() {
  return (
    <Panel id="media-devices">
      <MediaDevicesBody />
    </Panel>
  )
}

function MediaDevicesBody() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>()
  const [error, setError] = useState<string>()
  const refresh = useCallback(async () => {
    try {
      setDevices(await navigator.mediaDevices.enumerateDevices())
    } catch (err) {
      setError(describeError(err))
    }
  }, [])
  useEffect(() => {
    void refresh()
    navigator.mediaDevices.addEventListener('devicechange', refresh)
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh)
  }, [refresh])

  const unlock = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      s.getTracks().forEach(t => t.stop())
      await refresh()
    } catch (err) {
      setError(describeError(err))
    }
  }

  const kinds: [MediaDeviceKind, string][] = [['videoinput', 'Cameras'], ['audioinput', 'Microphones'], ['audiooutput', 'Speakers']]
  const hidden = devices?.some(d => !d.label)
  return (
    <>
      {devices && kinds.map(([kind, title]) => {
        const list = devices.filter(d => d.kind === kind)
        return (
          <div key={kind} className="device-group">
            <h4>{title} <span className="count">{list.length}</span></h4>
            <ul className="plain">
              {list.map((d, i) => <li key={d.deviceId || i}>{d.label || <em>hidden until permission is granted</em>}</li>)}
            </ul>
          </div>
        )
      })}
      {hidden && <button className="btn" onClick={unlock}>Reveal labels (asks for camera & mic)</button>}
      <p className="caption">Updates live on <code>devicechange</code>. Plug in a headset to see it.</p>
      <ErrorNote error={error} />
    </>
  )
}
