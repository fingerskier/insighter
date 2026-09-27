import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorNote, Panel, Segmented, Stat, StatGrid, StreamControls } from '../components/ui'
import { TimeSeries } from '../components/viz/TimeSeries'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useMetronome } from '../hooks/useMetronome'
import { useStream } from '../hooks/useStream'
import { parseHeartRate } from '../lib/heartRate'
import { clamp, fmt, magnitude } from '../lib/math'
import { describeError } from '../lib/platform'
import { Series } from '../lib/series'
import { deviceMotion, type MotionReading } from '../lib/sources'
import { StepDetector } from '../lib/steps'
import { heartRateStore, stepCadenceStore, useStore } from '../lib/store'

// ---------------------------------------------------------------- Heart-rate monitor

export function HeartRatePanel() {
  const [device, setDevice] = useState<BluetoothDevice>()
  const [battery, setBattery] = useState<number>()
  const [contact, setContact] = useState<boolean>()
  const [rr, setRr] = useState<number>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [low, setLow] = useLocalStorage('hr-low', 60)
  const [high, setHigh] = useLocalStorage('hr-high', 170)
  const bpm = useStore(heartRateStore)
  const series = useMemo(() => new Series(1800, 1), [])
  const zone = bpm == null ? undefined : bpm > high ? 'high' : bpm < low ? 'low' : 'ok'
  const lastZone = useRef(zone)

  // Haptic alert once when crossing out of the zone (fast buzz high, slow buzz low).
  useEffect(() => {
    if (zone && zone !== lastZone.current && zone !== 'ok') navigator.vibrate?.(zone === 'high' ? [66, 100, 66, 100, 66] : [600, 200, 600])
    lastZone.current = zone
  }, [zone])

  const disconnect = useCallback(() => {
    device?.gatt?.disconnect()
    setDevice(undefined)
    heartRateStore.set(undefined)
  }, [device])
  useEffect(() => () => device?.gatt?.disconnect(), [device])

  const connect = async () => {
    setError(undefined)
    setBusy(true)
    try {
      const d = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }], optionalServices: ['battery_service'] })
      d.addEventListener('gattserverdisconnected', () => {
        setDevice(undefined)
        heartRateStore.set(undefined)
      })
      const server = await d.gatt!.connect()
      const hr = await (await server.getPrimaryService('heart_rate')).getCharacteristic('heart_rate_measurement')
      hr.addEventListener('characteristicvaluechanged', e => {
        const sample = parseHeartRate((e.target as BluetoothRemoteGATTCharacteristic).value!)
        heartRateStore.set(sample.bpm)
        series.push(performance.now(), [sample.bpm])
        setContact(sample.contact)
        if (sample.rr.length) setRr(sample.rr[sample.rr.length - 1])
      })
      await hr.startNotifications()
      try {
        const level = await (await server.getPrimaryService('battery_service')).getCharacteristic('battery_level')
        setBattery((await level.readValue()).getUint8(0))
        level.addEventListener('characteristicvaluechanged', e => setBattery((e.target as BluetoothRemoteGATTCharacteristic).value!.getUint8(0)))
        await level.startNotifications().catch(() => {})
      } catch {
        setBattery(undefined) // Battery service is optional.
      }
      series.clear()
      setDevice(d)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel id="heart-rate" wide>
      <div className="controls-row">
        {device ? <button className="btn" onClick={disconnect}>Disconnect</button> : <button className="btn primary" onClick={connect} disabled={busy}>{busy ? 'Connecting…' : 'Connect monitor'}</button>}
        {device && <span className="status-line">● {device.name}</span>}
      </div>
      <ErrorNote error={error} />
      {device && (
        <>
          <div className="split">
            <div className={`heart zone-${zone ?? 'none'}`} style={{ ['--beat' as string]: bpm ? `${60 / bpm}s` : '0s' }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2 0 3.4 1.1 4.2 2.4h2.4c.8-1.3 2.2-2.4 4.2-2.4 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z" /></svg>
              <span className="bpm num">{bpm ?? '—'}</span>
              <span className="bpm-unit">BPM{zone === 'high' ? ' ▲ high' : zone === 'low' ? ' ▼ low' : ''}</span>
            </div>
            <div className="stack">
              <StatGrid>
                <Stat label="RR interval" value={fmt(rr, 0)} unit="ms" hint="Beat-to-beat time, if the strap reports it" />
                <Stat label="skin contact" value={contact == null ? 'n/a' : contact ? 'yes' : 'no'} />
                <Stat label="strap battery" value={battery ?? '—'} unit="%" />
              </StatGrid>
              <label className="range">
                <span>Low alert <strong className="num">{low}</strong></span>
                <input type="range" min={40} max={120} value={low} onChange={e => setLow(+e.target.value)} />
              </label>
              <label className="range">
                <span>High alert <strong className="num">{high}</strong></span>
                <input type="range" min={120} max={210} value={high} onChange={e => setHigh(+e.target.value)} />
              </label>
            </div>
          </div>
          <TimeSeries series={series} labels={['heart rate']} unit="BPM" windowMs={300_000} digits={0} />
        </>
      )}
      <p className="caption">Works with any standard BLE heart-rate strap or armband, such as Polar, Garmin HRM-Pro, Wahoo or Magene. Heart rate is shared with the metronome.</p>
    </Panel>
  )
}

// ---------------------------------------------------------------- Cadence metronome

type Mode = 'manual' | 'heart' | 'steps'

export function CadencePanel() {
  const m = useMetronome(100)
  const { setBpm } = m
  const [mode, setMode] = useState<Mode>('manual')
  const [target, setTarget] = useLocalStorage('hr-target', 140)
  const hr = useStore(heartRateStore)
  const steps = useStore(stepCadenceStore)

  // Heart mode: nudge tempo toward the target once a second (from the original AutoCadence).
  const hrRef = useRef(hr)
  hrRef.current = hr
  useEffect(() => {
    if (mode !== 'heart') return
    const timer = setInterval(() => {
      const current = hrRef.current
      if (current) setBpm(b => clamp(b + (target - current) * 0.1, 30, 240))
    }, 1000)
    return () => clearInterval(timer)
  }, [mode, target, setBpm])

  useEffect(() => {
    if (mode === 'steps' && steps) setBpm(clamp(steps, 30, 240))
  }, [mode, steps, setBpm])

  const nudge = (d: number) => m.setBpm(b => clamp(Math.round(b) + d, 30, 240))

  return (
    <Panel id="cadence" wide>
      <div className="split">
        <div className="metronome">
          <div className="beats" aria-hidden="true">
            {[0, 1, 2, 3].map(i => <span key={i} className={m.playing && m.beat % 4 === i ? 'on' : ''} />)}
          </div>
          <div className="tempo num">{Math.round(m.bpm)}<small> BPM</small></div>
          <div className="button-row">
            <button className="btn primary big" onClick={() => (m.playing ? m.stop() : void m.start())}>{m.playing ? 'Stop' : 'Start'}</button>
          </div>
        </div>
        <div className="stack">
          <Segmented<Mode>
            label="Tempo source"
            value={mode}
            onChange={setMode}
            options={[{ value: 'manual', label: 'Manual' }, { value: 'heart', label: 'Heart target' }, { value: 'steps', label: 'Match steps' }]}
          />
          {mode === 'manual' && (
            <>
              <input type="range" min={30} max={240} value={Math.round(m.bpm)} onChange={e => m.setBpm(+e.target.value)} aria-label="Tempo" />
              <div className="button-row">
                {[-5, -1, 1, 5].map(d => <button key={d} className="btn small" onClick={() => nudge(d)}>{d > 0 ? `+${d}` : d}</button>)}
              </div>
            </>
          )}
          {mode === 'heart' && (
            <>
              <label className="range">
                <span>Target heart rate <strong className="num">{target}</strong></span>
                <input type="range" min={60} max={200} value={target} onChange={e => setTarget(+e.target.value)} />
              </label>
              <p className="caption">{hr ? `Heart rate ${hr} BPM. Tempo rises while below target and falls while above.` : 'Connect a heart-rate monitor above to drive the tempo.'}</p>
            </>
          )}
          {mode === 'steps' && <p className="caption">{steps ? `Following your step cadence: ${Math.round(steps)} steps/min.` : 'Start the step tracker and walk. The tempo locks to your cadence.'}</p>}
          <label className="range">
            <span>Volume <strong className="num">{Math.round(m.volume * 100)}%</strong></span>
            <input type="range" min={0} max={1} step={0.01} value={m.volume} onChange={e => m.setVolume(+e.target.value)} />
          </label>
          <label className="range">
            <span>Pitch <strong className="num">{m.pitch} Hz</strong></span>
            <input type="range" min={220} max={1760} step={10} value={m.pitch} onChange={e => m.setPitch(+e.target.value)} />
          </label>
          <label className="check"><input type="checkbox" checked={m.haptics} onChange={e => m.setHaptics(e.target.checked)} /> Vibrate on each beat</label>
        </div>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- Step & cadence tracker

export function WigglePanel() {
  const detector = useMemo(() => new StepDetector(), [])
  const [steps, setSteps] = useState(0)
  const [cadence, setCadence] = useState<number>()
  const stream = useStream<MotionReading>(
    (emit, fail) => {
      detector.reset()
      setSteps(0)
      return deviceMotion(r => {
        const g = r.gravityIncluded
        if (g && detector.push(magnitude(g), performance.now())) setSteps(detector.steps)
        emit(r)
      }, fail)
    },
    {
      channels: 1,
      toSeries: r => [r.gravityIncluded ? magnitude(r.gravityIncluded) : NaN],
    },
  )

  useEffect(() => {
    if (stream.status !== 'active') return
    const timer = setInterval(() => {
      const c = detector.cadence(performance.now())
      setCadence(c)
      stepCadenceStore.set(c)
    }, 1000)
    return () => {
      clearInterval(timer)
      stepCadenceStore.set(undefined)
    }
  }, [stream.status, detector])

  const intensity = stream.latest?.acceleration ? magnitude(stream.latest.acceleration) : undefined
  return (
    <Panel id="wiggle">
      <StreamControls stream={stream} startLabel="Start tracking" waiting="Put the phone in a pocket or hold it, and walk." />
      {stream.status === 'active' && (
        <>
          <StatGrid>
            <Stat label="steps" value={steps} />
            <Stat label="cadence" value={fmt(cadence, 0)} unit="steps/min" />
            <Stat label="motion" value={fmt(intensity, 1)} unit="m/s²" hint="Magnitude of acceleration with gravity removed" />
          </StatGrid>
          <TimeSeries series={stream.series} labels={['|a| incl. gravity']} unit="m/s²" digits={1} height={100} />
          <p className="caption">Each step shows up as a peak in the magnitude trace. Cadence feeds the metronome's Match steps mode.</p>
        </>
      )}
    </Panel>
  )
}
