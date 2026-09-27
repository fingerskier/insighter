import { createContext, useContext, type ReactNode } from 'react'
import type { Stream } from '../hooks/useStream'
import { API_BY_ID, availability, AVAILABILITY_LABEL, type ApiInfo, type Availability } from '../lib/support'

const PanelContext = createContext<ApiInfo | null>(null)
export const usePanelApi = () => useContext(PanelContext)!

/** When true, cards for APIs this browser can't use are not rendered. */
export const HideUnavailableContext = createContext(false)

const ICON: Record<Availability, string> = { available: '●', unsupported: '○', insecure: '⚿', blocked: '⊘' }

export function StatusPill({ state }: { state: Availability }) {
  return (
    <span className={`pill pill-${state}`}>
      <span aria-hidden="true">{ICON[state]}</span> {AVAILABILITY_LABEL[state]}
    </span>
  )
}

/**
 * Card for one API. When the API is not usable here it explains why instead of
 * rendering its body, so every card has something true to say.
 */
export function Panel({ id, wide, children }: { id: string; wide?: boolean; children: ReactNode }) {
  const api = API_BY_ID[id]
  const state = availability(api)
  const hideUnavailable = useContext(HideUnavailableContext)
  if (hideUnavailable && state !== 'available') return null
  return (
    <PanelContext.Provider value={api}>
      <article id={`api-${api.id}`} className={`panel${wide ? ' wide' : ''}${state !== 'available' ? ' muted' : ''}`} aria-labelledby={`title-${api.id}`}>
        <header className="panel-head">
          <div>
            <h3 id={`title-${api.id}`}>{api.name}</h3>
            <p className="summary">{api.summary}</p>
          </div>
          <StatusPill state={state} />
        </header>
        <div className="panel-body">
          {state === 'available' ? children : <Unavailable api={api} state={state} />}
        </div>
        <footer className="panel-foot">
          <code>{api.surface}</code>
          <a href={api.docs} target="_blank" rel="noreferrer">Docs ↗</a>
        </footer>
      </article>
    </PanelContext.Provider>
  )
}

function Unavailable({ api, state }: { api: ApiInfo; state: Availability }) {
  const reason: Record<Exclude<Availability, 'available'>, string> = {
    unsupported: 'This browser does not expose this API.',
    insecure: 'This API only exists on secure origins (HTTPS or localhost). Open Insighter over HTTPS to try it.',
    blocked: 'A Permissions-Policy header or iframe allow-list disables this feature for this page.',
  }
  return (
    <div className="unavailable">
      <p>{reason[state as Exclude<Availability, 'available'>]}</p>
      {api.where && state === 'unsupported' && <p className="where">Ships in: {api.where}</p>}
    </div>
  )
}

export function Stat({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: string }) {
  return (
    <div className="stat" title={hint}>
      <span className="stat-label">{label}</span>
      <span className="stat-value num">
        {value}
        {unit && <small> {unit}</small>}
      </span>
    </div>
  )
}

export const StatGrid = ({ children }: { children: ReactNode }) => <div className="stat-grid">{children}</div>

/** Start/stop control plus status line for a stream. */
export function StreamControls<R>({ stream, startLabel = 'Start', waiting = 'Waiting for the first reading…', children }: {
  stream: Stream<R>
  startLabel?: string
  waiting?: string
  children?: ReactNode
}) {
  const running = stream.status === 'active' || stream.status === 'starting'
  return (
    <div className="controls">
      <div className="controls-row">
        {running ? (
          <button className="btn" onClick={stream.stop}>Stop</button>
        ) : (
          <button className="btn primary" onClick={() => void stream.start()}>{stream.status === 'error' ? 'Retry' : startLabel}</button>
        )}
        {children}
        <span className="status-line" aria-live="polite">
          {stream.status === 'starting' && 'Starting…'}
          {stream.status === 'active' && (stream.count ? <><span className="live-dot" aria-hidden="true" /> Live · {stream.count.toLocaleString()} readings</> : waiting)}
        </span>
      </div>
      {stream.error && <p className="error" role="alert">{stream.error}</p>}
    </div>
  )
}

export function ErrorNote({ error }: { error?: string }) {
  return error ? <p className="error" role="alert">{error}</p> : null
}

/** Newest-first event list. */
export function EventLog({ entries, empty = 'No events yet.' }: { entries: { at: number; text: string }[]; empty?: string }) {
  return (
    <ol className="log" aria-live="polite">
      {entries.length === 0 && <li className="log-empty">{empty}</li>}
      {entries.map((e, i) => (
        <li key={`${e.at}-${i}`}>
          <time className="num">{new Date(e.at).toLocaleTimeString([], { hour12: false })}</time>
          <span>{e.text}</span>
        </li>
      ))}
    </ol>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
