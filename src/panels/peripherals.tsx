import { useEffect, useRef, useState } from 'react'
import { ErrorNote, EventLog, Panel, Stat, StatGrid } from '../components/ui'
import { useEventLog } from '../hooks/useEventLog'
import { describeError } from '../lib/platform'

const hex = (n: number | undefined, width = 4) => (n == null ? '—' : `0x${n.toString(16).padStart(width, '0')}`)
const bytes = (view: DataView) =>
  Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), b => b.toString(16).padStart(2, '0')).join(' ')

// ---------------------------------------------------------------- Web Bluetooth

/** Well-known GATT services, so a generic scan can open them without filters. */
const KNOWN_SERVICES: Record<string, string> = {
  generic_access: 'Generic Access',
  device_information: 'Device Information',
  battery_service: 'Battery',
  heart_rate: 'Heart Rate',
  cycling_speed_and_cadence: 'Cycling Speed & Cadence',
  cycling_power: 'Cycling Power',
  running_speed_and_cadence: 'Running Speed & Cadence',
  environmental_sensing: 'Environmental Sensing',
  fitness_machine: 'Fitness Machine',
  health_thermometer: 'Health Thermometer',
  human_interface_device: 'HID over GATT',
  weight_scale: 'Weight Scale',
  pulse_oximeter: 'Pulse Oximeter',
}

type GattService = { uuid: string; name?: string; characteristics: { uuid: string; props: string[]; value?: string }[] }

export function BluetoothPanel() {
  const [device, setDevice] = useState<BluetoothDevice>()
  const [services, setServices] = useState<GattService[]>([])
  const [radio, setRadio] = useState<boolean>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    navigator.bluetooth?.getAvailability?.().then(setRadio).catch(() => {})
  }, [])
  useEffect(() => () => device?.gatt?.disconnect(), [device])

  const scan = async () => {
    setError(undefined)
    setServices([])
    setBusy(true)
    try {
      const d = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: Object.keys(KNOWN_SERVICES) })
      setDevice(d)
      d.addEventListener('gattserverdisconnected', () => setDevice(prev => (prev === d ? undefined : prev)))
      const server = await d.gatt!.connect()
      const primaries = await server.getPrimaryServices()
      const found: GattService[] = []
      for (const s of primaries) {
        const name = Object.entries(KNOWN_SERVICES).find(([key]) => BluetoothUUID.getService(key) === s.uuid)?.[1]
        const chars = await s.getCharacteristics().catch(() => [] as BluetoothRemoteGATTCharacteristic[])
        const characteristics = await Promise.all(
          chars.map(async c => {
            const props = Object.entries(c.properties).filter(([, on]) => on === true).map(([k]) => k)
            let value: string | undefined
            if (c.properties.read) value = await c.readValue().then(v => {
              const text = new TextDecoder().decode(v)
              return /^[\x20-\x7e]+$/.test(text) ? `"${text}"` : bytes(v)
            }).catch(() => undefined)
            return { uuid: c.uuid, props, value }
          }),
        )
        found.push({ uuid: s.uuid, name, characteristics })
      }
      setServices(found)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel id="bluetooth" wide>
      <div className="controls-row">
        <button className="btn primary" onClick={scan} disabled={busy}>{busy ? 'Reading GATT…' : 'Choose a device'}</button>
        {device && <button className="btn" onClick={() => device.gatt?.disconnect()}>Disconnect</button>}
        <span className="status-line">{radio === false ? '○ No Bluetooth radio reported' : device ? `● ${device.name ?? device.id}` : ''}</span>
      </div>
      <ErrorNote error={error} />
      {services.length > 0 && (
        <ul className="tree">
          {services.map(s => (
            <li key={s.uuid}>
              <strong>{s.name ?? 'Service'}</strong> <code className="small">{s.uuid}</code>
              <ul>
                {s.characteristics.map(c => (
                  <li key={c.uuid}>
                    <code className="small">{c.uuid}</code> <span className="tags">{c.props.join(' · ')}</span>
                    {c.value && <div className="mono small value">{c.value}</div>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="caption">Only services in the known list above are visible. Browsers block access to the rest unless a page asks for them by UUID.</p>
    </Panel>
  )
}

// ---------------------------------------------------------------- WebUSB

export function UsbPanel() {
  return (
    <Panel id="usb">
      <UsbBody />
    </Panel>
  )
}

function UsbBody() {
  const [device, setDevice] = useState<USBDevice>()
  const [paired, setPaired] = useState<USBDevice[]>([])
  const [error, setError] = useState<string>()
  const { entries, log } = useEventLog(8)

  useEffect(() => {
    const refresh = () => navigator.usb.getDevices().then(setPaired).catch(() => {})
    const onConnect = (e: USBConnectionEvent) => { log(`connect: ${e.device.productName ?? hex(e.device.productId)}`); refresh() }
    const onDisconnect = (e: USBConnectionEvent) => { log(`disconnect: ${e.device.productName ?? hex(e.device.productId)}`); refresh() }
    refresh()
    navigator.usb.addEventListener('connect', onConnect)
    navigator.usb.addEventListener('disconnect', onDisconnect)
    return () => {
      navigator.usb.removeEventListener('connect', onConnect)
      navigator.usb.removeEventListener('disconnect', onDisconnect)
    }
  }, [log])

  const choose = async () => {
    setError(undefined)
    try {
      setDevice(await navigator.usb.requestDevice({ filters: [] }))
      setPaired(await navigator.usb.getDevices())
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <>
      <div className="controls-row">
        <button className="btn primary" onClick={choose}>Choose a device</button>
        {paired.length > 0 && (
          <select aria-label="Previously allowed devices" value="" onChange={e => setDevice(paired[+e.target.value])}>
            <option value="" disabled>Allowed ({paired.length})</option>
            {paired.map((d, i) => <option key={i} value={i}>{d.productName ?? hex(d.productId)}</option>)}
          </select>
        )}
      </div>
      <ErrorNote error={error} />
      {device && (
        <>
          <StatGrid>
            <Stat label="product" value={device.productName ?? '—'} />
            <Stat label="maker" value={device.manufacturerName ?? '—'} />
            <Stat label="VID:PID" value={`${hex(device.vendorId)}:${hex(device.productId)}`} />
            <Stat label="USB" value={`${device.usbVersionMajor}.${device.usbVersionMinor}`} />
            <Stat label="class" value={hex(device.deviceClass, 2)} />
            <Stat label="serial" value={device.serialNumber ?? '—'} />
          </StatGrid>
          <ul className="tree">
            {device.configurations.map(c => (
              <li key={c.configurationValue}>
                <strong>Configuration {c.configurationValue}</strong> {c.configurationName}
                <ul>
                  {c.interfaces.map(i => (
                    <li key={i.interfaceNumber}>
                      Interface {i.interfaceNumber}: class {hex(i.alternate.interfaceClass, 2)}
                      {i.alternate.interfaceName && ` · ${i.alternate.interfaceName}`}
                      <span className="tags"> {i.alternate.endpoints.map(e => `EP${e.endpointNumber} ${e.direction} ${e.type}`).join(' · ')}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="caption">Devices claimed by an OS driver (keyboards, storage, audio) are hidden from WebUSB by design.</p>
      <EventLog entries={entries} empty="Plug or unplug an allowed device." />
    </>
  )
}

// ---------------------------------------------------------------- Web Serial

const BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600]

export function SerialPanel() {
  const [port, setPort] = useState<SerialPort>()
  const [baud, setBaud] = useState(115200)
  const [output, setOutput] = useState('')
  const [line, setLine] = useState('')
  const [error, setError] = useState<string>()
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array>>(undefined)
  const outRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight })
  }, [output])

  const close = async () => {
    try {
      await readerRef.current?.cancel()
      readerRef.current?.releaseLock()
      await port?.close()
    } catch {
      // Already closed or unplugged.
    }
    readerRef.current = undefined
    setPort(undefined)
  }
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => () => void closeRef.current(), [])

  const open = async () => {
    setError(undefined)
    try {
      const p = await navigator.serial.requestPort()
      await p.open({ baudRate: baud })
      setPort(p)
      setOutput('')
      const decoder = new TextDecoder()
      const reader = p.readable!.getReader()
      readerRef.current = reader
      void (async () => {
        try {
          for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            setOutput(prev => (prev + decoder.decode(value, { stream: true })).slice(-20_000))
          }
        } catch (err) {
          setError(describeError(err))
        }
      })()
    } catch (err) {
      setError(describeError(err))
    }
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!port?.writable) return
    const writer = port.writable.getWriter()
    await writer.write(new TextEncoder().encode(`${line}\r\n`))
    writer.releaseLock()
    setLine('')
  }

  const info = port?.getInfo()
  return (
    <Panel id="serial" wide>
      <div className="controls-row">
        {port ? <button className="btn" onClick={close}>Close</button> : <button className="btn primary" onClick={open}>Open a port</button>}
        <select value={baud} onChange={e => setBaud(+e.target.value)} disabled={!!port} aria-label="Baud rate">
          {BAUDS.map(b => <option key={b} value={b}>{b.toLocaleString()} baud</option>)}
        </select>
        {info && <span className="status-line">● {info.usbVendorId != null ? `${hex(info.usbVendorId)}:${hex(info.usbProductId)}` : 'native port'}</span>}
      </div>
      <ErrorNote error={error} />
      {port && (
        <>
          <pre ref={outRef} className="terminal">{output || 'Connected. Waiting for data…'}</pre>
          <form className="controls-row" onSubmit={send}>
            <input className="grow" value={line} onChange={e => setLine(e.target.value)} placeholder="Send a line (CRLF appended)" aria-label="Line to send" />
            <button className="btn">Send</button>
          </form>
        </>
      )}
      <p className="caption">Try a MicroPython board: open at 115200 and send <code>help()</code>.</p>
    </Panel>
  )
}

// ---------------------------------------------------------------- WebHID

export function HidPanel() {
  const [device, setDevice] = useState<HIDDevice>()
  const [error, setError] = useState<string>()
  const { entries, log, clear } = useEventLog(30)

  useEffect(() => {
    if (!device) return
    const onReport = (e: HIDInputReportEvent) => log(`report ${e.reportId}: ${bytes(e.data)}`)
    device.addEventListener('inputreport', onReport)
    return () => {
      device.removeEventListener('inputreport', onReport)
      void device.close()
    }
  }, [device, log])

  const choose = async () => {
    setError(undefined)
    try {
      const [d] = await navigator.hid.requestDevice({ filters: [] })
      if (!d) return
      if (!d.opened) await d.open()
      clear()
      setDevice(d)
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <Panel id="hid">
      <div className="controls-row">
        <button className="btn primary" onClick={choose}>Choose a device</button>
        {device && <span className="status-line">● {device.productName}</span>}
      </div>
      <ErrorNote error={error} />
      {device && (
        <>
          <StatGrid>
            <Stat label="VID:PID" value={`${hex(device.vendorId)}:${hex(device.productId)}`} />
            <Stat label="collections" value={device.collections.length} />
            <Stat label="usage page" value={hex(device.collections[0]?.usagePage)} />
          </StatGrid>
          <EventLog entries={entries} empty="Move or press the device to see raw input reports." />
        </>
      )}
      <p className="caption">Keyboards and mice are blocked for privacy. Try a SpaceMouse, a game controller or a macro pad.</p>
    </Panel>
  )
}

// ---------------------------------------------------------------- Web MIDI

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const midiNote = (n: number) => `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`

function describeMidi([status, a, b]: Uint8Array) {
  const kind = status & 0xf0
  const ch = (status & 0x0f) + 1
  if (kind === 0x90 && b > 0) return `ch${ch} note on  ${midiNote(a)} vel ${b}`
  if (kind === 0x80 || kind === 0x90) return `ch${ch} note off ${midiNote(a)}`
  if (kind === 0xb0) return `ch${ch} CC ${a} = ${b}`
  if (kind === 0xe0) return `ch${ch} pitch bend ${((b << 7) | a) - 8192}`
  if (kind === 0xc0) return `ch${ch} program ${a}`
  if (kind === 0xd0) return `ch${ch} pressure ${a}`
  return `0x${status.toString(16)}`
}

export function MidiPanel() {
  const [access, setAccess] = useState<MIDIAccess>()
  const [inputs, setInputs] = useState<string[]>([])
  const [held, setHeld] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string>()
  const { entries, log } = useEventLog(24)

  useEffect(() => {
    if (!access) return
    const onMessage = (e: MIDIMessageEvent) => {
      if (!e.data || e.data[0] >= 0xf8) return // skip clock/active-sensing
      log(describeMidi(e.data))
      const [status, note, vel] = e.data
      const kind = status & 0xf0
      if (kind === 0x90 || kind === 0x80) {
        setHeld(prev => {
          const next = new Set(prev)
          if (kind === 0x90 && vel > 0) next.add(note); else next.delete(note)
          return next
        })
      }
    }
    const bind = () => {
      const list: string[] = []
      access.inputs.forEach(input => {
        input.onmidimessage = onMessage
        list.push(input.name ?? input.id)
      })
      setInputs(list)
    }
    bind()
    access.onstatechange = e => {
      const port = (e as MIDIConnectionEvent).port
      if (port) log(`${port.name} ${port.state}`)
      bind()
    }
    return () => {
      access.inputs.forEach(input => (input.onmidimessage = null))
      access.onstatechange = null
    }
  }, [access, log])

  const connect = async () => {
    setError(undefined)
    try {
      setAccess(await navigator.requestMIDIAccess())
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <Panel id="midi">
      {!access && <button className="btn primary" onClick={connect}>Connect MIDI</button>}
      <ErrorNote error={error} />
      {access && (
        <>
          <p className="caption">{inputs.length ? `Inputs: ${inputs.join(', ')}` : 'No MIDI inputs. Plug one in and it will appear here.'}</p>
          <div className="keys" aria-label="Held notes">
            {Array.from({ length: 25 }, (_, i) => 48 + i).map(n => (
              <span key={n} className={`key${NOTE_NAMES[n % 12].includes('♯') ? ' black' : ''}${held.has(n) ? ' on' : ''}`} title={midiNote(n)} />
            ))}
          </div>
          <EventLog entries={entries} empty="Play something." />
        </>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------- Web NFC

export function NfcPanel() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string>()
  const { entries, log } = useEventLog(12)
  const abortRef = useRef<AbortController>(undefined)

  useEffect(() => () => abortRef.current?.abort(), [])

  const scan = async () => {
    setError(undefined)
    try {
      const reader = new NDEFReader()
      const controller = new AbortController()
      abortRef.current = controller
      reader.onreading = e => {
        const records = e.message.records.map(r => {
          if (r.recordType === 'text' || r.recordType === 'url') return `${r.recordType}: ${new TextDecoder(r.encoding ?? 'utf-8').decode(r.data)}`
          return `${r.recordType}${r.mediaType ? ` (${r.mediaType})` : ''}`
        })
        log(`${e.serialNumber || 'tag'} → ${records.join(' | ') || 'empty'}`)
      }
      reader.onreadingerror = () => log('Tag detected but could not be read')
      await reader.scan({ signal: controller.signal })
      setScanning(true)
    } catch (err) {
      setError(describeError(err))
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setScanning(false)
  }

  return (
    <Panel id="nfc">
      <div className="controls-row">
        {scanning ? <button className="btn" onClick={stop}>Stop</button> : <button className="btn primary" onClick={scan}>Scan for tags</button>}
        {scanning && <span className="status-line"><span className="live-dot" /> Hold a tag to the back of the phone</span>}
      </div>
      <ErrorNote error={error} />
      <EventLog entries={entries} empty="No tags read yet." />
    </Panel>
  )
}
