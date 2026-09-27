import { useEffect, useRef, useState } from 'react'
import { ErrorNote, EventLog, Panel, Stat, StatGrid, StreamControls } from '../components/ui'
import { TimeSeries } from '../components/viz/TimeSeries'
import { Meter } from '../components/viz/Viz'
import { useEventLog } from '../hooks/useEventLog'
import { useStream } from '../hooks/useStream'
import { fmt } from '../lib/math'
import { describeError, navx, winx, type IdleDetectorLike } from '../lib/platform'
import { battery, gamepads, network, rumble, type BatteryReading, type NetworkReading, type PadSnapshot } from '../lib/sources'

const duration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}

export function BatteryPanel() {
  const stream = useStream<BatteryReading>(battery, { channels: 1, toSeries: b => [b.level * 100] })
  const b = stream.latest
  return (
    <Panel id="battery">
      <StreamControls stream={stream} />
      {b && (
        <>
          <Meter label={b.charging ? 'Charging ⚡' : 'On battery'} value={b.level * 100} min={0} max={100} unit="%" />
          <StatGrid>
            <Stat label="until full" value={b.charging ? duration(b.chargingTime) : '—'} />
            <Stat label="until empty" value={b.charging ? '—' : duration(b.dischargingTime)} />
          </StatGrid>
          <TimeSeries series={stream.series} labels={['level']} unit="%" min={0} max={100} digits={0} height={80} windowMs={600_000} />
        </>
      )}
    </Panel>
  )
}

export function NetworkPanel() {
  return (
    <Panel id="network">
      <NetworkBody />
    </Panel>
  )
}

function NetworkBody() {
  const stream = useStream<NetworkReading>(network, {
    autoStart: true,
    channels: 1,
    toSeries: n => [n.rtt ?? NaN],
  })
  const { entries, log } = useEventLog(12)
  const n = stream.latest
  useEffect(() => {
    if (n?.change) log(n.change === 'change' ? `connection → ${n.effectiveType ?? '?'}, ${n.downlink ?? '?'} Mb/s` : n.change)
  }, [n, log])
  if (!n) return null
  const detailed = n.effectiveType != null
  return (
    <>
      <StatGrid>
        <Stat label="status" value={n.online ? '● online' : '○ offline'} />
        {detailed && <Stat label="effective type" value={n.effectiveType} />}
        {detailed && <Stat label="downlink" value={fmt(n.downlink, 1)} unit="Mb/s" hint="Rounded to 25 kb/s, capped at 10 Mb/s for privacy" />}
        {detailed && <Stat label="RTT" value={fmt(n.rtt, 0)} unit="ms" hint="Rounded to 25 ms for privacy" />}
        {n.type && <Stat label="link" value={n.type} />}
        {detailed && <Stat label="data saver" value={n.saveData ? 'on' : 'off'} />}
      </StatGrid>
      {detailed ? (
        <TimeSeries series={stream.series} labels={['RTT']} unit="ms" min={0} digits={0} height={80} windowMs={60_000} />
      ) : (
        <p className="note">This browser reports online/offline only. Connection quality is Chromium-only.</p>
      )}
      <p className="caption">Toggle airplane mode or DevTools throttling to see events.</p>
      <EventLog entries={entries} />
    </>
  )
}

function useScreenInfo() {
  const read = () => ({
    screen: `${screen.width}×${screen.height}`,
    avail: `${screen.availWidth}×${screen.availHeight}`,
    viewport: `${innerWidth}×${innerHeight}`,
    dpr: devicePixelRatio,
    depth: screen.colorDepth,
    orientation: screen.orientation?.type ?? '—',
    angle: screen.orientation?.angle ?? 0,
    extended: (screen as Screen & { isExtended?: boolean }).isExtended,
  })
  const [info, setInfo] = useState(read)
  useEffect(() => {
    const update = () => setInfo(read())
    addEventListener('resize', update)
    screen.orientation?.addEventListener('change', update)
    const dprQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
    dprQuery.addEventListener('change', update)
    return () => {
      removeEventListener('resize', update)
      screen.orientation?.removeEventListener('change', update)
      dprQuery.removeEventListener('change', update)
    }
  }, [])
  return info
}

const MEDIA_FEATURES: [string, string[]][] = [
  ['prefers-color-scheme', ['dark', 'light']],
  ['prefers-reduced-motion', ['reduce', 'no-preference']],
  ['prefers-contrast', ['more', 'less', 'custom', 'no-preference']],
  ['color-gamut', ['rec2020', 'p3', 'srgb']],
  ['dynamic-range', ['high', 'standard']],
  ['pointer', ['fine', 'coarse', 'none']],
  ['hover', ['hover', 'none']],
  ['display-mode', ['standalone', 'fullscreen', 'minimal-ui', 'browser']],
  ['forced-colors', ['active', 'none']],
]

function useMediaFeatures() {
  const read = () => MEDIA_FEATURES.map(([f, values]) => [f, values.find(v => matchMedia(`(${f}: ${v})`).matches) ?? '—'] as const)
  const [features, setFeatures] = useState(read)
  useEffect(() => {
    const queries = MEDIA_FEATURES.flatMap(([f, values]) => values.map(v => matchMedia(`(${f}: ${v})`)))
    const update = () => setFeatures(read())
    queries.forEach(q => q.addEventListener('change', update))
    return () => queries.forEach(q => q.removeEventListener('change', update))
  }, [])
  return features
}

export function ScreenPanel() {
  return (
    <Panel id="screen">
      <ScreenBody />
    </Panel>
  )
}

function ScreenBody() {
  const s = useScreenInfo()
  const features = useMediaFeatures()
  return (
    <>
      <StatGrid>
        <Stat label="screen" value={s.screen} unit="CSS px" />
        <Stat label="viewport" value={s.viewport} unit="CSS px" />
        <Stat label="pixel ratio" value={fmt(s.dpr, 2)} unit="×" hint="Changes with browser zoom" />
        <Stat label="color depth" value={s.depth} unit="bit" />
        <Stat label="orientation" value={s.orientation} />
        <Stat label="angle" value={s.angle} unit="°" />
        {s.extended != null && <Stat label="multi-screen" value={s.extended ? 'yes' : 'no'} />}
      </StatGrid>
      <table className="kv">
        <tbody>
          {features.map(([f, v]) => (
            <tr key={f}><th scope="row"><code>{f}</code></th><td>{v}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="caption">Live. Rotate the device, zoom, or change OS appearance settings.</p>
    </>
  )
}

type PointerInfo = {
  id: number
  type: string
  x: number
  y: number
  pressure: number
  tiltX: number
  tiltY: number
  twist: number
  width: number
  height: number
}

export function PointerPanel() {
  const padRef = useRef<HTMLDivElement>(null)
  const [pointers, setPointers] = useState<Map<number, PointerInfo>>(new Map())
  const [last, setLast] = useState<PointerInfo>()

  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const info: PointerInfo = {
      id: e.pointerId,
      type: e.pointerType,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      twist: e.twist,
      width: e.width,
      height: e.height,
    }
    setLast(info)
    if (e.type === 'pointerdown') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // The pointer can already be gone (e.g. a tap that ended immediately).
      }
    }
    setPointers(prev => {
      const next = new Map(prev)
      if (e.type === 'pointerup' || e.type === 'pointercancel' || (e.type === 'pointerleave' && e.pointerType === 'mouse')) next.delete(e.pointerId)
      else if (e.buttons || e.pointerType !== 'mouse') next.set(e.pointerId, info)
      return next
    })
  }

  return (
    <Panel id="pointer" wide>
      <div
        ref={padRef}
        className="pointer-pad"
        onPointerDown={track}
        onPointerMove={track}
        onPointerUp={track}
        onPointerCancel={track}
        onPointerLeave={track}
        aria-label="Pointer test area"
      >
        {[...pointers.values()].map(p => (
          <span
            key={p.id}
            className="contact"
            style={{
              left: p.x,
              top: p.y,
              width: Math.max(p.width, 16) + p.pressure * 40,
              height: Math.max(p.height, 16) + p.pressure * 40,
              transform: `translate(-50%, -50%) rotate(${p.twist}deg) skew(${p.tiltX / 3}deg, ${p.tiltY / 3}deg)`,
            }}
          />
        ))}
        {pointers.size === 0 && <span className="pad-hint">Draw here with a finger, pen or mouse. Try several fingers at once.</span>}
      </div>
      <StatGrid>
        <Stat label="type" value={last?.type ?? '—'} />
        <Stat label="active" value={pointers.size} hint={`navigator.maxTouchPoints = ${navigator.maxTouchPoints}`} />
        <Stat label="pressure" value={fmt(last?.pressure, 2)} />
        <Stat label="tilt x / y" value={last ? `${last.tiltX}° / ${last.tiltY}°` : '—'} />
        <Stat label="twist" value={last ? last.twist : '—'} unit="°" />
        <Stat label="contact" value={last ? `${fmt(last.width, 0)}×${fmt(last.height, 0)}` : '—'} unit="px" />
      </StatGrid>
    </Panel>
  )
}

export function GamepadPanel() {
  return (
    <Panel id="gamepad" wide>
      <GamepadBody />
    </Panel>
  )
}

function GamepadBody() {
  const stream = useStream<PadSnapshot[]>(gamepads, { autoStart: true })
  const pads = stream.latest ?? []
  return (
    <>
      {pads.length === 0 && <p className="note">Connect a controller and press any button. Browsers hide gamepads until a button is pressed.</p>}
      {pads.map(p => (
        <div key={p.index} className="pad">
          <div className="pad-head">
            <strong>#{p.index}</strong> <span className="mono small">{p.id}</span>
            {p.canRumble && <button className="btn small" onClick={() => void rumble(p.index)}>Rumble</button>}
          </div>
          <div className="sticks">
            {Array.from({ length: Math.ceil(p.axes.length / 2) }, (_, i) => (
              <svg key={i} viewBox="-50 -50 100 100" className="stick" role="img" aria-label={`Stick ${i + 1}`}>
                <circle r="46" className="stick-ring" />
                <line x1="-46" x2="46" y1="0" y2="0" className="level-cross" />
                <line y1="-46" y2="46" x1="0" x2="0" className="level-cross" />
                <circle cx={(p.axes[i * 2] ?? 0) * 40} cy={(p.axes[i * 2 + 1] ?? 0) * 40} r="8" className="stick-dot" />
              </svg>
            ))}
          </div>
          <div className="buttons">
            {p.buttons.map((b, i) => (
              <span key={i} className={`gp-btn${b.pressed ? ' on' : ''}`} style={{ ['--v' as string]: b.value }} title={`button ${i}: ${b.value.toFixed(2)}`}>{i}</span>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

const PATTERNS: { label: string; pattern: number[] }[] = [
  { label: 'Tap', pattern: [40] },
  { label: 'Double', pattern: [60, 80, 60] },
  { label: 'Heartbeat', pattern: [80, 120, 160, 600, 80, 120, 160] },
  { label: 'SOS', pattern: [100, 60, 100, 60, 100, 200, 300, 60, 300, 60, 300, 200, 100, 60, 100, 60, 100] },
  { label: 'Long', pattern: [1000] },
]

export function VibrationPanel() {
  const [result, setResult] = useState<string>()
  const buzz = (pattern: number[]) => setResult(navigator.vibrate(pattern) ? `Accepted [${pattern.join(', ')}]` : 'Rejected. The device may lack a motor, or silent mode is on.')
  return (
    <Panel id="vibration">
      <div className="button-row">
        {PATTERNS.map(p => <button key={p.label} className="btn" onClick={() => buzz(p.pattern)}>{p.label}</button>)}
        <button className="btn" onClick={() => buzz([0])}>Cancel</button>
      </div>
      {result && <p className="caption">{result}</p>}
      <p className="caption">Patterns alternate vibrate and pause durations in ms. Requires a tap first (sticky activation).</p>
    </Panel>
  )
}

export function WakeLockPanel() {
  const [sentinel, setSentinel] = useState<WakeLockSentinel>()
  const [error, setError] = useState<string>()
  const { entries, log } = useEventLog(8)
  const [wanted, setWanted] = useState(false)

  const acquire = async () => {
    setError(undefined)
    try {
      const s = await navigator.wakeLock.request('screen')
      s.addEventListener('release', () => {
        log('released')
        setSentinel(undefined)
      })
      log('acquired')
      setSentinel(s)
      setWanted(true)
    } catch (err) {
      setError(describeError(err))
    }
  }
  const release = async () => {
    setWanted(false)
    await sentinel?.release()
  }

  // The browser drops the lock when the tab is hidden; take it back on return.
  useEffect(() => {
    if (!wanted) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel) void acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  })
  useEffect(() => () => void sentinel?.release(), [sentinel])

  return (
    <Panel id="wake-lock">
      <div className="controls-row">
        {sentinel ? <button className="btn primary" onClick={release}>Release</button> : <button className="btn" onClick={acquire}>Keep screen on</button>}
        <span className="status-line">{sentinel ? '● Screen will stay on' : '○ Normal sleep behavior'}</span>
      </div>
      <ErrorNote error={error} />
      <EventLog entries={entries} empty="Switch tabs while locked to watch it release and re-acquire." />
    </Panel>
  )
}

export function IdlePanel() {
  const { entries, log } = useEventLog(12)
  const stream = useStream<{ user: string; screen: string }>(async emit => {
    const Idle = winx().IdleDetector!
    if ((await Idle.requestPermission()) !== 'granted') throw new DOMException('Idle detection permission was not granted.', 'NotAllowedError')
    const controller = new AbortController()
    const detector: IdleDetectorLike = new Idle()
    const read = () => emit({ user: detector.userState ?? '—', screen: detector.screenState ?? '—' })
    detector.addEventListener('change', read)
    await detector.start({ threshold: 60_000, signal: controller.signal })
    read()
    return () => controller.abort()
  })
  const r = stream.latest
  useEffect(() => {
    if (r) log(`user ${r.user}, screen ${r.screen}`)
  }, [r, log])
  return (
    <Panel id="idle">
      <StreamControls stream={stream} startLabel="Start detecting" />
      {r && (
        <StatGrid>
          <Stat label="user" value={r.user} />
          <Stat label="screen" value={r.screen} />
        </StatGrid>
      )}
      <p className="caption">Idle after 60 s without input (the API minimum). Lock the screen to see it change.</p>
      <EventLog entries={entries} />
    </Panel>
  )
}

export function LifecyclePanel() {
  return (
    <Panel id="lifecycle">
      <LifecycleBody />
    </Panel>
  )
}

function LifecycleBody() {
  const { entries, log } = useEventLog(15)
  const [state, setState] = useState({ visibility: document.visibilityState, focus: document.hasFocus() })
  useEffect(() => {
    const update = (e: Event) => {
      setState({ visibility: document.visibilityState, focus: document.hasFocus() })
      log(e.type === 'visibilitychange' ? `visibilitychange → ${document.visibilityState}` : e.type)
    }
    const docEvents = ['visibilitychange', 'freeze', 'resume']
    const winEvents = ['focus', 'blur', 'pageshow', 'pagehide']
    docEvents.forEach(e => document.addEventListener(e, update))
    winEvents.forEach(e => addEventListener(e, update))
    return () => {
      docEvents.forEach(e => document.removeEventListener(e, update))
      winEvents.forEach(e => removeEventListener(e, update))
    }
  }, [log])
  return (
    <>
      <StatGrid>
        <Stat label="visibility" value={state.visibility} />
        <Stat label="focus" value={state.focus ? 'focused' : 'blurred'} />
      </StatGrid>
      <EventLog entries={entries} empty="Switch tabs or windows, then come back." />
    </>
  )
}

type HardwareInfo = Record<string, string | number | undefined>

export function HardwarePanel() {
  return (
    <Panel id="hardware" wide>
      <HardwareBody />
    </Panel>
  )
}

function HardwareBody() {
  const [info, setInfo] = useState<HardwareInfo>({})
  const [error, setError] = useState<string>()
  useEffect(() => {
    let alive = true
    const merge = (more: HardwareInfo) => alive && setInfo(prev => ({ ...prev, ...more }))
    const n = navx()
    merge({
      'CPU threads': navigator.hardwareConcurrency,
      'Memory class': n.deviceMemory != null ? `${n.deviceMemory} GB (coarsened for privacy)` : undefined,
      'Touch points': navigator.maxTouchPoints,
      Language: navigator.languages?.join(', '),
      'Time zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    const ua = n.userAgentData
    if (ua) {
      merge({ Browser: ua.brands.filter(b => !/Not.?A.?Brand/i.test(b.brand)).map(b => `${b.brand} ${b.version}`).join(', '), Platform: ua.platform, Mobile: ua.mobile ? 'yes' : 'no' })
      ua.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion'])
        .then(v => merge({ Architecture: [v.architecture, v.bitness && `${v.bitness}-bit`].filter(Boolean).join(' '), Model: (v.model as string) || undefined, 'OS version': v.platformVersion as string }))
        .catch(() => {})
    } else {
      merge({ 'User agent': navigator.userAgent })
    }
    navigator.storage?.estimate?.()
      .then(e => merge({ 'Storage used': e.usage != null ? `${(e.usage / 1e6).toFixed(1)} MB` : undefined, 'Storage quota': e.quota != null ? `${(e.quota / 1e9).toFixed(1)} GB` : undefined }))
      .catch(err => alive && setError(describeError(err)))
    const gl = document.createElement('canvas').getContext('webgl')
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info')
    if (gl && dbg) merge({ 'WebGL renderer': gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string })
    n.gpu?.requestAdapter()
      .then(a => a && merge({ 'WebGPU adapter': [a.info?.vendor, a.info?.architecture, a.info?.description].filter(Boolean).join(' · ') || 'available' }))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return (
    <>
      <table className="kv">
        <tbody>
          {Object.entries(info).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
            <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>
          ))}
        </tbody>
      </table>
      <ErrorNote error={error} />
      <p className="caption">Browsers round or withhold several of these to limit fingerprinting.</p>
    </>
  )
}
