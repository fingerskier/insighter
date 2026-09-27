import { useMemo, useState, type ReactNode } from 'react'
import { HideUnavailableContext } from './components/ui'
import { useLocalStorage } from './hooks/useLocalStorage'
import { APIS, availability, AVAILABILITY_LABEL, CATEGORIES, type Category } from './lib/support'
import { BatteryPanel, GamepadPanel, HardwarePanel, IdlePanel, LifecyclePanel, NetworkPanel, PointerPanel, ScreenPanel, VibrationPanel, WakeLockPanel } from './panels/device'
import { MotionSection } from './panels/motion'
import { BluetoothPanel, HidPanel, MidiPanel, NfcPanel, SerialPanel, UsbPanel } from './panels/peripherals'
import { AmbientLightPanel, AmbientTemperaturePanel, CameraPanel, ComputePressurePanel, GeolocationPanel, MediaDevicesPanel, MicrophonePanel } from './panels/sensing'
import { CadencePanel, HeartRatePanel, WigglePanel } from './panels/showcase'

const SECTIONS: Record<Category, ReactNode> = {
  motion: <MotionSection />,
  environment: <><AmbientLightPanel /><ComputePressurePanel /><AmbientTemperaturePanel /></>,
  location: <GeolocationPanel />,
  media: <><MicrophonePanel /><CameraPanel /><MediaDevicesPanel /></>,
  device: <><PointerPanel /><ScreenPanel /><BatteryPanel /><NetworkPanel /><GamepadPanel /><VibrationPanel /><WakeLockPanel /><LifecyclePanel /><IdlePanel /><HardwarePanel /></>,
  peripherals: <><BluetoothPanel /><SerialPanel /><UsbPanel /><HidPanel /><MidiPanel /><NfcPanel /></>,
  showcase: <><HeartRatePanel /><CadencePanel /><WigglePanel /></>,
}

export default function App() {
  const [hideUnavailable, setHideUnavailable] = useLocalStorage('hide-unavailable', false)
  const [only, setOnly] = useState<Category | 'all'>('all')
  const states = useMemo(() => APIS.map(api => ({ api, state: availability(api) })), [])
  const available = states.filter(s => s.state === 'available').length

  const visible = CATEGORIES.filter(c => only === 'all' || only === c.id).filter(
    c => !hideUnavailable || states.some(s => s.api.category === c.id && s.state === 'available'),
  )

  return (
    <HideUnavailableContext.Provider value={hideUnavailable}>
      <header className="masthead">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icons/insighter128.png`} alt="" width={48} height={48} />
          <div>
            <h1>Insighter</h1>
            <p className="tagline">What can this browser sense? Every device-facing Web API, detected and visualized live.</p>
          </div>
        </div>
        <div className="scoreboard">
          <div className="score">
            <strong className="num">{available}</strong>
            <span>of {APIS.length} APIs usable here</span>
          </div>
          <div className={`context-badge ${window.isSecureContext ? 'ok' : 'warn'}`}>
            {window.isSecureContext ? '● Secure context' : '⚿ Insecure context: most sensors hidden'}
          </div>
        </div>
      </header>

      <nav className="capability-map" aria-label="Capability map">
        {CATEGORIES.map(c => (
          <section key={c.id} className="cap-group">
            <h2>{c.label}</h2>
            <ul>
              {states.filter(s => s.api.category === c.id).map(({ api, state }) => (
                <li key={api.id}>
                  <a
                    href={`#api-${api.id}`}
                    className={`cap cap-${state}`}
                    title={`${api.name}: ${AVAILABILITY_LABEL[state]}`}
                    onClick={() => {
                      if (state !== 'available' && hideUnavailable) setHideUnavailable(false)
                      if (only !== 'all' && only !== c.id) setOnly('all')
                    }}
                  >
                    <span className="cap-dot" aria-hidden="true" />
                    {api.name}
                    <span className="sr-only"> ({AVAILABILITY_LABEL[state]})</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="toolbar" role="toolbar" aria-label="Filters">
        <div className="chips" role="radiogroup" aria-label="Category">
          {[{ id: 'all' as const, label: 'All' }, ...CATEGORIES].map(c => (
            <button key={c.id} role="radio" aria-checked={only === c.id} className={`chip${only === c.id ? ' on' : ''}`} onClick={() => setOnly(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={hideUnavailable} onChange={e => setHideUnavailable(e.target.checked)} /> Hide unavailable
        </label>
      </div>

      <main>
        {visible.map(c => (
          <section key={c.id} className="category" aria-labelledby={`cat-${c.id}`}>
            <div className="category-head">
              <h2 id={`cat-${c.id}`}>{c.label}</h2>
              <p>{c.blurb}</p>
            </div>
            <div className="grid">{SECTIONS[c.id]}</div>
          </section>
        ))}
      </main>

      <footer className="site-foot">
        <p>
          Nothing leaves your device. Every reading is processed in this tab and discarded when you close it.
          Most sensors need a tap to start, and some need a phone.{' '}
          <a href="https://github.com/fingerskier/insighter" target="_blank" rel="noreferrer">Source on GitHub ↗</a>
        </p>
      </footer>
    </HideUnavailableContext.Provider>
  )
}
