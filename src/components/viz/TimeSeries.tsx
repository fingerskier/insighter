import { useEffect, useRef, useState } from 'react'
import type { Series } from '../../lib/series'

type Props = {
  series: Series
  labels: string[]
  unit?: string
  /** Fixed y-range; otherwise auto-scaled to the visible window. */
  min?: number
  max?: number
  /** Keep zero centred when auto-scaling signed data. */
  symmetric?: boolean
  windowMs?: number
  height?: number
  digits?: number
}

/** Categorical slots in fixed order: the entity keeps its color. */
const SLOTS = ['--series-1', '--series-2', '--series-3', '--series-4']

/**
 * Streaming line chart on canvas. Redraws on its own animation frame from the
 * ring buffer, so readings never pass through React state.
 */
export function TimeSeries({ series, labels, unit = '', min, max, symmetric, windowMs = 10_000, height = 132, digits = 2 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef<number | null>(null)
  const [hover, setHover] = useState<{ x: number; values: number[]; ago: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let frame = 0
    let colors: string[] = []
    let chrome = { grid: '', axis: '', muted: '', surface: '' }
    let visible = true

    const readColors = () => {
      const style = getComputedStyle(canvas)
      colors = SLOTS.map(s => style.getPropertyValue(s).trim())
      chrome = {
        grid: style.getPropertyValue('--grid').trim(),
        axis: style.getPropertyValue('--axis').trim(),
        muted: style.getPropertyValue('--text-muted').trim(),
        surface: style.getPropertyValue('--surface-1').trim(),
      }
    }
    readColors()
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', readColors)

    const resize = () => {
      const dpr = devicePixelRatio || 1
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    // Offscreen charts skip drawing entirely.
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    io.observe(canvas)

    const draw = () => {
      frame = requestAnimationFrame(draw)
      if (!visible) return
      const dpr = devicePixelRatio || 1
      const w = canvas.width
      const h = canvas.height
      const pad = { l: 44 * dpr, r: 8 * dpr, t: 8 * dpr, b: 8 * dpr }
      const now = performance.now()
      const t0 = now - windowMs

      // Find the visible range.
      let first = series.length
      for (let i = series.length - 1; i >= 0; i--) {
        if (series.time(i) < t0) break
        first = i
      }
      let lo = min ?? Infinity
      let hi = max ?? -Infinity
      if (min == null || max == null) {
        for (let i = first; i < series.length; i++) {
          for (let c = 0; c < series.channels; c++) {
            const v = series.value(i, c)
            if (!Number.isFinite(v)) continue
            if (min == null) lo = Math.min(lo, v)
            if (max == null) hi = Math.max(hi, v)
          }
        }
        if (!Number.isFinite(lo) || !Number.isFinite(hi)) { lo = min ?? -1; hi = max ?? 1 }
        if (symmetric) { const m = Math.max(Math.abs(lo), Math.abs(hi)); lo = -m; hi = m }
        if (hi - lo < 1e-6) { hi += 0.5; lo -= 0.5 }
        const padY = (hi - lo) * 0.08
        if (min == null) lo -= padY
        if (max == null) hi += padY
      }

      const x = (t: number) => pad.l + ((t - t0) / windowMs) * (w - pad.l - pad.r)
      const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b)

      ctx.clearRect(0, 0, w, h)

      // Recessive grid: min, mid, max, and zero when in range.
      ctx.lineWidth = dpr
      ctx.font = `${11 * dpr}px system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const ticks = [hi, (hi + lo) / 2, lo]
      for (const v of ticks) {
        ctx.strokeStyle = chrome.grid
        ctx.beginPath(); ctx.moveTo(pad.l, y(v)); ctx.lineTo(w - pad.r, y(v)); ctx.stroke()
        ctx.fillStyle = chrome.muted
        ctx.fillText(formatTick(v), pad.l - 6 * dpr, y(v))
      }
      if (lo < 0 && hi > 0) {
        ctx.strokeStyle = chrome.axis
        ctx.beginPath(); ctx.moveTo(pad.l, y(0)); ctx.lineTo(w - pad.r, y(0)); ctx.stroke()
      }

      ctx.save()
      ctx.beginPath()
      ctx.rect(pad.l, 0, w - pad.l - pad.r, h)
      ctx.clip()
      ctx.lineWidth = 2 * dpr
      ctx.lineJoin = 'round'
      for (let c = 0; c < series.channels; c++) {
        ctx.strokeStyle = colors[c % colors.length]
        ctx.beginPath()
        let pen = false
        for (let i = Math.max(first - 1, 0); i < series.length; i++) {
          const v = series.value(i, c)
          if (!Number.isFinite(v)) { pen = false; continue }
          const px = x(series.time(i))
          const py = y(v)
          if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py)
          pen = true
        }
        ctx.stroke()
      }
      ctx.restore()

      // Crosshair
      const hx = hoverRef.current
      if (hx != null && series.length) {
        const px = hx * dpr
        const t = t0 + ((px - pad.l) / (w - pad.l - pad.r)) * windowMs
        let best = -1
        let bestDist = Infinity
        for (let i = first; i < series.length; i++) {
          const d = Math.abs(series.time(i) - t)
          if (d < bestDist) { bestDist = d; best = i }
        }
        if (best >= 0) {
          const bx = x(series.time(best))
          ctx.strokeStyle = chrome.axis
          ctx.lineWidth = dpr
          ctx.beginPath(); ctx.moveTo(bx, pad.t); ctx.lineTo(bx, h - pad.b); ctx.stroke()
          const values: number[] = []
          for (let c = 0; c < series.channels; c++) {
            const v = series.value(best, c)
            values.push(v)
            if (!Number.isFinite(v)) continue
            ctx.fillStyle = colors[c % colors.length]
            ctx.strokeStyle = chrome.surface
            ctx.lineWidth = 2 * dpr
            ctx.beginPath(); ctx.arc(bx, y(v), 4 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
          }
          setHover(prev => {
            const ago = now - series.time(best)
            if (prev && prev.x === hx && prev.values.every((v, i) => v === values[i])) return prev
            return { x: hx, values, ago }
          })
        }
      }
    }
    draw()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      io.disconnect()
      scheme.removeEventListener('change', readColors)
    }
  }, [series, min, max, symmetric, windowMs])

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    hoverRef.current = e.clientX - e.currentTarget.getBoundingClientRect().left
  }
  const onLeave = () => {
    hoverRef.current = null
    setHover(null)
  }

  return (
    <figure className="timeseries">
      <div className="timeseries-plot">
        <canvas
          ref={canvasRef}
          style={{ height }}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          role="img"
          aria-label={`Live chart of ${labels.join(', ')} over the last ${windowMs / 1000} seconds`}
        />
        {hover && (
          <div className="tooltip" style={{ left: hover.x }}>
            <div className="tooltip-title">{(hover.ago / 1000).toFixed(1)} s ago</div>
            {labels.map((label, i) => (
              <div key={label} className="tooltip-row">
                <span className="swatch" style={{ background: `var(${SLOTS[i]})` }} />
                <span>{label}</span>
                <span className="num">{Number.isFinite(hover.values[i]) ? hover.values[i].toFixed(digits) : '—'}{unit && ` ${unit}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {labels.length > 1 && (
        <figcaption className="legend">
          {labels.map((label, i) => (
            <span key={label}>
              <span className="swatch" style={{ background: `var(${SLOTS[i]})` }} />
              {label}
            </span>
          ))}
          <span className="legend-note">last {windowMs / 1000} s{unit && ` · ${unit}`}</span>
        </figcaption>
      )}
    </figure>
  )
}

function formatTick(v: number) {
  const a = Math.abs(v)
  if (a >= 100) return v.toFixed(0)
  if (a >= 10) return v.toFixed(1)
  return v.toFixed(2)
}
