import { useEffect, useRef } from 'react'
import { clamp, quatToCssMatrix, type Quat } from '../../lib/math'

/** A phone-shaped box rotated by a device-frame quaternion. Flat on a table, face up, shows its screen. */
export function DeviceModel({ quaternion, label }: { quaternion: Quat; label?: string }) {
  return (
    <div className="device-stage" role="img" aria-label={label ?? 'Device attitude'}>
      <div className="device" style={{ transform: quatToCssMatrix(quaternion) }}>
        <div className="face front"><span className="notch" /><span className="face-label">TOP</span></div>
        <div className="face back" />
        <div className="face right" />
        <div className="face left" />
        <div className="face top" />
        <div className="face bottom" />
      </div>
    </div>
  )
}

/** Compass rose with a needle at `heading` degrees clockwise from north. */
export function Compass({ heading, caption }: { heading: number | undefined; caption?: string }) {
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10)
  return (
    <figure className="compass">
      <svg viewBox="-100 -100 200 200" role="img" aria-label={heading == null ? 'No heading' : `Heading ${Math.round(heading)} degrees`}>
        <circle r="92" className="compass-ring" />
        {ticks.map(t => (
          <line key={t} className={t % 90 === 0 ? 'tick major' : 'tick'} x1="0" y1={t % 90 === 0 ? -92 : -92} x2="0" y2={t % 90 === 0 ? -78 : -85} transform={`rotate(${t})`} />
        ))}
        {(['N', 'E', 'S', 'W'] as const).map((d, i) => (
          <text key={d} className={d === 'N' ? 'cardinal north' : 'cardinal'} transform={`rotate(${i * 90}) translate(0 -62) rotate(${-i * 90})`}>{d}</text>
        ))}
        {heading != null && (
          <g transform={`rotate(${heading})`} className="needle">
            <path d="M0 -70 L9 0 L0 10 L-9 0 Z" className="needle-north" />
            <path d="M0 70 L9 0 L0 -10 L-9 0 Z" className="needle-south" />
          </g>
        )}
        <circle r="5" className="hub" />
      </svg>
      <figcaption>
        <strong className="num">{heading == null ? '—' : `${Math.round(heading)}°`}</strong>
        {caption && <span>{caption}</span>}
      </figcaption>
    </figure>
  )
}

/** Horizontal bar meter; optional log scale for quantities like lux. */
export function Meter({ value, min, max, log, label, unit, digits = 0 }: {
  value: number | undefined; min: number; max: number; log?: boolean; label: string; unit?: string; digits?: number
}) {
  const scale = (v: number) => (log ? Math.log10(Math.max(v, min)) : v)
  const fraction = value == null ? 0 : clamp((scale(value) - scale(min)) / (scale(max) - scale(min)), 0, 1)
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}>
      <div className="meter-head">
        <span>{label}</span>
        <strong className="num">{value == null ? '—' : value.toFixed(digits)}{unit && <small> {unit}</small>}</strong>
      </div>
      <div className="meter-track"><div className="meter-fill" style={{ width: `${fraction * 100}%` }} /></div>
      <div className="meter-scale"><span>{min}{unit && ` ${unit}`}</span><span>{max.toLocaleString()}{unit && ` ${unit}`}</span></div>
    </div>
  )
}

/** Bubble level from the gravity vector's x/y components (m/s²). */
export function SpiritLevel({ x, y }: { x: number; y: number }) {
  // Readings are the upward reaction to gravity (flat = 0, 0, +g). The bubble
  // drifts to the raised edge; ±g along an axis puts it on the rim.
  const g = 9.81
  const bx = clamp(x / g, -1, 1) * 42
  const by = clamp(-y / g, -1, 1) * 42
  const level = Math.hypot(x, y) < 0.35
  return (
    <svg className={`level${level ? ' is-level' : ''}`} viewBox="-50 -50 100 100" role="img" aria-label={level ? 'Level' : 'Tilted'}>
      <circle r="48" className="level-ring" />
      <circle r="12" className="level-target" />
      <line x1="-48" x2="48" y1="0" y2="0" className="level-cross" />
      <line y1="-48" y2="48" x1="0" x2="0" className="level-cross" />
      <circle cx={bx} cy={by} r="9" className="level-bubble" />
    </svg>
  )
}

/** Log-frequency spectrum bars from an AnalyserNode byte spectrum. */
export function Spectrum({ data, binHz, version, height = 120 }: {
  data: Uint8Array | undefined; binHz: number; /** Changes whenever `data` (a reused buffer) is refilled. */ version: number; height?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !data) return
    const dpr = devicePixelRatio || 1
    const w = (canvas.width = Math.round(canvas.clientWidth * dpr))
    const h = (canvas.height = Math.round(canvas.clientHeight * dpr))
    const ctx = canvas.getContext('2d')!
    const style = getComputedStyle(canvas)
    ctx.clearRect(0, 0, w, h)
    const bars = 64
    const fMin = 40
    const fMax = Math.min(16000, data.length * binHz)
    const gap = 2 * dpr
    const bw = w / bars - gap
    ctx.fillStyle = style.getPropertyValue('--series-1').trim()
    for (let b = 0; b < bars; b++) {
      const f0 = fMin * (fMax / fMin) ** (b / bars)
      const f1 = fMin * (fMax / fMin) ** ((b + 1) / bars)
      let peak = 0
      for (let i = Math.floor(f0 / binHz); i <= Math.ceil(f1 / binHz) && i < data.length; i++) peak = Math.max(peak, data[i])
      const bh = Math.max((peak / 255) * h, dpr)
      const x = b * (bw + gap)
      ctx.beginPath()
      ctx.roundRect(x, h - bh, bw, bh, [Math.min(4 * dpr, bw / 2), Math.min(4 * dpr, bw / 2), 0, 0])
      ctx.fill()
    }
  }, [data, binHz, version])
  return (
    <figure className="spectrum">
      <canvas ref={ref} style={{ height }} role="img" aria-label="Audio spectrum, 40 Hz to 16 kHz on a log scale" />
      <figcaption className="axis-labels"><span>40 Hz</span><span>250</span><span>1k</span><span>4k</span><span>16 kHz</span></figcaption>
    </figure>
  )
}

/** A top-down path of east/north metre offsets with the latest point highlighted. */
export function Track({ points, accuracy }: { points: { east: number; north: number }[]; accuracy?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = devicePixelRatio || 1
    const w = (canvas.width = Math.round(canvas.clientWidth * dpr))
    const h = (canvas.height = Math.round(canvas.clientHeight * dpr))
    const ctx = canvas.getContext('2d')!
    const style = getComputedStyle(canvas)
    ctx.clearRect(0, 0, w, h)
    if (!points.length) return
    const last = points[points.length - 1]
    let extent = Math.max(accuracy ?? 10, 10)
    for (const p of points) extent = Math.max(extent, Math.abs(p.east - last.east), Math.abs(p.north - last.north))
    const scale = (Math.min(w, h) / 2 - 12 * dpr) / extent
    const px = (p: { east: number }) => w / 2 + (p.east - last.east) * scale
    const py = (p: { north: number }) => h / 2 - (p.north - last.north) * scale

    // Scale bar
    const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(m => m * scale > w / 6) ?? 10000
    ctx.strokeStyle = style.getPropertyValue('--text-muted').trim()
    ctx.fillStyle = ctx.strokeStyle
    ctx.lineWidth = dpr
    ctx.beginPath(); ctx.moveTo(10 * dpr, h - 10 * dpr); ctx.lineTo(10 * dpr + nice * scale, h - 10 * dpr); ctx.stroke()
    ctx.font = `${11 * dpr}px system-ui, sans-serif`
    ctx.fillText(nice >= 1000 ? `${nice / 1000} km` : `${nice} m`, 10 * dpr, h - 16 * dpr)

    if (accuracy) {
      ctx.fillStyle = style.getPropertyValue('--accent-wash').trim()
      ctx.beginPath(); ctx.arc(w / 2, h / 2, accuracy * scale, 0, Math.PI * 2); ctx.fill()
    }
    ctx.strokeStyle = style.getPropertyValue('--series-1').trim()
    ctx.lineWidth = 2 * dpr
    ctx.lineJoin = 'round'
    ctx.beginPath()
    points.forEach((p, i) => (i ? ctx.lineTo(px(p), py(p)) : ctx.moveTo(px(p), py(p))))
    ctx.stroke()
    ctx.fillStyle = ctx.strokeStyle
    ctx.strokeStyle = style.getPropertyValue('--surface-1').trim()
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 5 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }, [points, accuracy])
  return <canvas ref={ref} className="track" role="img" aria-label={`Track of ${points.length} fixes, north up`} />
}
