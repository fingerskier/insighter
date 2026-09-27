export type Category = 'motion' | 'environment' | 'location' | 'media' | 'device' | 'peripherals' | 'showcase'

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: 'motion', label: 'Motion & orientation', blurb: 'Inertial sensors: how the device moves and which way it faces.' },
  { id: 'environment', label: 'Environment', blurb: 'What the device can sense about its surroundings.' },
  { id: 'location', label: 'Location', blurb: 'Where the device is on Earth.' },
  { id: 'media', label: 'Camera & microphone', blurb: 'Capture devices, as raw signals.' },
  { id: 'device', label: 'Device & system', blurb: 'Power, network, display, input and the hardware underneath.' },
  { id: 'peripherals', label: 'Peripherals', blurb: 'Talk to hardware directly: Bluetooth, USB, serial, HID, MIDI, NFC.' },
  { id: 'showcase', label: 'Showcase', blurb: 'Small apps that combine several APIs.' },
]

/**
 * available   – the API is exposed and allowed here
 * unsupported – this browser does not implement it
 * insecure    – it exists only in secure contexts (HTTPS / localhost)
 * blocked     – a Permissions-Policy disables it for this document
 */
export type Availability = 'available' | 'unsupported' | 'insecure' | 'blocked'

export type ApiInfo = {
  id: string
  name: string
  category: Category
  /** The call a developer would write, shown on the card. */
  surface: string
  docs: string
  summary: string
  present: () => boolean
  secureOnly?: boolean
  /** Permissions-Policy feature name, when one gates the API. */
  policy?: string
  /** Extra context shown when unsupported (e.g. which browsers ship it). */
  where?: string
}

const has = (name: string) => typeof window !== 'undefined' && name in window
const nav = (name: string) => typeof navigator !== 'undefined' && name in navigator
const mdn = (path: string) => `https://developer.mozilla.org/en-US/docs/Web/API/${path}`

const CHROMIUM_ANDROID = 'Chromium-based browsers on Android (and some Windows/ChromeOS devices with sensor hubs).'
const CHROMIUM_DESKTOP = 'Chromium-based desktop browsers (Chrome, Edge, Opera).'

export const APIS: ApiInfo[] = [
  // Motion & orientation — Generic Sensor API
  { id: 'accelerometer', name: 'Accelerometer', category: 'motion', surface: 'new Accelerometer({ frequency })', docs: mdn('Accelerometer'), summary: 'Acceleration along each device axis, including gravity (m/s²).', present: () => has('Accelerometer'), secureOnly: true, policy: 'accelerometer', where: CHROMIUM_ANDROID },
  { id: 'linear-acceleration', name: 'Linear acceleration', category: 'motion', surface: 'new LinearAccelerationSensor()', docs: mdn('LinearAccelerationSensor'), summary: 'Acceleration with gravity removed: only the motion you cause.', present: () => has('LinearAccelerationSensor'), secureOnly: true, policy: 'accelerometer', where: CHROMIUM_ANDROID },
  { id: 'gravity', name: 'Gravity', category: 'motion', surface: 'new GravitySensor()', docs: mdn('GravitySensor'), summary: 'The gravity vector alone: which way is down.', present: () => has('GravitySensor'), secureOnly: true, policy: 'accelerometer', where: CHROMIUM_ANDROID },
  { id: 'gyroscope', name: 'Gyroscope', category: 'motion', surface: 'new Gyroscope({ frequency })', docs: mdn('Gyroscope'), summary: 'Angular velocity around each axis (rad/s).', present: () => has('Gyroscope'), secureOnly: true, policy: 'gyroscope', where: CHROMIUM_ANDROID },
  { id: 'magnetometer', name: 'Magnetometer', category: 'motion', surface: 'new Magnetometer()', docs: 'https://w3c.github.io/magnetometer/', summary: 'The local magnetic field (µT): a raw compass.', present: () => has('Magnetometer'), secureOnly: true, policy: 'magnetometer', where: 'Chromium on Android behind chrome://flags/#enable-generic-sensor-extra-classes.' },
  { id: 'absolute-orientation', name: 'Absolute orientation', category: 'motion', surface: 'new AbsoluteOrientationSensor()', docs: mdn('AbsoluteOrientationSensor'), summary: 'Fused attitude relative to Earth (north, east, up) as a quaternion.', present: () => has('AbsoluteOrientationSensor'), secureOnly: true, policy: 'magnetometer', where: CHROMIUM_ANDROID },
  { id: 'relative-orientation', name: 'Relative orientation', category: 'motion', surface: 'new RelativeOrientationSensor()', docs: mdn('RelativeOrientationSensor'), summary: 'Fused attitude without a magnetic reference: drifts in yaw but ignores magnets.', present: () => has('RelativeOrientationSensor'), secureOnly: true, policy: 'gyroscope', where: CHROMIUM_ANDROID },
  { id: 'device-motion', name: 'Device motion events', category: 'motion', surface: "addEventListener('devicemotion')", docs: mdn('DeviceMotionEvent'), summary: 'The older, universally shipped motion API: acceleration and rotation rate as events.', present: () => has('DeviceMotionEvent'), secureOnly: true, policy: 'accelerometer' },
  { id: 'device-orientation', name: 'Device orientation events', category: 'motion', surface: "addEventListener('deviceorientation')", docs: mdn('DeviceOrientationEvent'), summary: 'Alpha/beta/gamma Euler angles, plus a compass heading where available.', present: () => has('DeviceOrientationEvent'), secureOnly: true, policy: 'gyroscope' },

  // Environment
  { id: 'ambient-light', name: 'Ambient light', category: 'environment', surface: 'new AmbientLightSensor()', docs: mdn('AmbientLightSensor'), summary: 'Illuminance around the device in lux.', present: () => has('AmbientLightSensor'), secureOnly: true, policy: 'ambient-light-sensor', where: 'Chromium behind chrome://flags/#enable-generic-sensor-extra-classes, on devices with a light sensor.' },
  { id: 'ambient-temperature', name: 'Ambient temperature', category: 'environment', surface: 'new AmbientTemperatureSensor()', docs: 'https://w3c.github.io/sensors/', summary: 'Proposed in early Generic Sensor drafts. No browser ships it, which makes it a useful check that detection works.', present: () => has('AmbientTemperatureSensor'), secureOnly: true, where: 'No shipping browser. Listed so the detection logic has a known negative.' },
  { id: 'pressure', name: 'Compute pressure', category: 'environment', surface: "new PressureObserver(cb).observe('cpu')", docs: mdn('Compute_Pressure_API'), summary: 'Thermal and power pressure on the CPU, as nominal / fair / serious / critical.', present: () => has('PressureObserver'), secureOnly: true, policy: 'compute-pressure', where: CHROMIUM_DESKTOP },

  // Location
  { id: 'geolocation', name: 'Geolocation', category: 'location', surface: 'navigator.geolocation.watchPosition()', docs: mdn('Geolocation_API'), summary: 'Position, accuracy, altitude, heading and speed from GNSS, Wi-Fi and cell data.', present: () => nav('geolocation'), secureOnly: true, policy: 'geolocation' },

  // Media
  { id: 'microphone', name: 'Microphone', category: 'media', surface: 'getUserMedia({ audio }) → AnalyserNode', docs: mdn('AnalyserNode'), summary: 'Live sound level, spectrum and pitch, computed with Web Audio.', present: () => !!navigator.mediaDevices?.getUserMedia, secureOnly: true, policy: 'microphone' },
  { id: 'camera', name: 'Camera', category: 'media', surface: 'getUserMedia({ video })', docs: mdn('MediaDevices/getUserMedia'), summary: 'Live video, track settings and capabilities such as the torch, and scene brightness.', present: () => !!navigator.mediaDevices?.getUserMedia, secureOnly: true, policy: 'camera' },
  { id: 'media-devices', name: 'Media devices', category: 'media', surface: 'navigator.mediaDevices.enumerateDevices()', docs: mdn('MediaDevices/enumerateDevices'), summary: 'Every camera, microphone and speaker the browser can see.', present: () => !!navigator.mediaDevices?.enumerateDevices, secureOnly: true },

  // Device & system
  { id: 'battery', name: 'Battery status', category: 'device', surface: 'navigator.getBattery()', docs: mdn('Battery_Status_API'), summary: 'Charge level, charging state and time estimates.', present: () => nav('getBattery'), secureOnly: true, policy: 'battery', where: 'Chromium-based browsers. Firefox and Safari removed it over fingerprinting concerns.' },
  { id: 'network', name: 'Network information', category: 'device', surface: 'navigator.connection', docs: mdn('Network_Information_API'), summary: 'Online state, estimated bandwidth, round-trip time and data-saver preference.', present: () => nav('onLine'), where: 'Online/offline everywhere; connection quality in Chromium only.' },
  { id: 'screen', name: 'Screen & display', category: 'device', surface: 'screen.orientation · matchMedia()', docs: mdn('Screen'), summary: 'Resolution, pixel density, orientation angle, color gamut, HDR and user preferences.', present: () => has('screen') },
  { id: 'pointer', name: 'Pointer & touch', category: 'device', surface: "addEventListener('pointermove')", docs: mdn('Pointer_events'), summary: 'Pen pressure, tilt and twist, touch contact size and multi-touch.', present: () => has('PointerEvent') },
  { id: 'gamepad', name: 'Gamepad', category: 'device', surface: 'navigator.getGamepads()', docs: mdn('Gamepad_API'), summary: 'Controller sticks, triggers and buttons, polled each frame, with rumble.', present: () => nav('getGamepads'), secureOnly: true, policy: 'gamepad' },
  { id: 'vibration', name: 'Vibration', category: 'device', surface: 'navigator.vibrate(pattern)', docs: mdn('Vibration_API'), summary: 'Haptic patterns on devices with a vibration motor.', present: () => nav('vibrate'), where: 'Android browsers. iOS Safari does not implement it.' },
  { id: 'wake-lock', name: 'Screen wake lock', category: 'device', surface: "navigator.wakeLock.request('screen')", docs: mdn('Screen_Wake_Lock_API'), summary: 'Keep the screen from dimming while a sensor is recording.', present: () => nav('wakeLock'), secureOnly: true, policy: 'screen-wake-lock' },
  { id: 'idle', name: 'Idle detection', category: 'device', surface: 'new IdleDetector().start()', docs: mdn('Idle_Detection_API'), summary: 'Whether the user is active and whether the screen is locked, OS-wide.', present: () => has('IdleDetector'), secureOnly: true, policy: 'idle-detection', where: CHROMIUM_DESKTOP },
  { id: 'lifecycle', name: 'Page lifecycle', category: 'device', surface: "document.visibilityState · 'freeze'", docs: mdn('Page_Visibility_API'), summary: 'Visibility, focus, freeze and resume: what the browser does to a background tab.', present: () => 'visibilityState' in document },
  { id: 'hardware', name: 'Hardware & platform', category: 'device', surface: 'navigator.hardwareConcurrency · userAgentData · gpu', docs: mdn('Navigator/hardwareConcurrency'), summary: 'CPU cores, memory class, storage quota, GPU adapter and client hints.', present: () => true },

  // Peripherals
  { id: 'bluetooth', name: 'Web Bluetooth', category: 'peripherals', surface: 'navigator.bluetooth.requestDevice()', docs: mdn('Web_Bluetooth_API'), summary: 'Pick a nearby BLE device and explore its GATT services.', present: () => nav('bluetooth'), secureOnly: true, policy: 'bluetooth', where: 'Chromium on desktop and Android. Linux may need chrome://flags/#enable-experimental-web-platform-features.' },
  { id: 'usb', name: 'WebUSB', category: 'peripherals', surface: 'navigator.usb.requestDevice()', docs: mdn('WebUSB_API'), summary: 'Enumerate a USB device: descriptors, configurations and interfaces.', present: () => nav('usb'), secureOnly: true, policy: 'usb', where: CHROMIUM_DESKTOP + ' Also Chrome on Android.' },
  { id: 'serial', name: 'Web Serial', category: 'peripherals', surface: 'navigator.serial.requestPort()', docs: mdn('Web_Serial_API'), summary: 'A serial terminal for microcontrollers, GPS modules and other UART devices.', present: () => nav('serial'), secureOnly: true, policy: 'serial', where: CHROMIUM_DESKTOP },
  { id: 'hid', name: 'WebHID', category: 'peripherals', surface: 'navigator.hid.requestDevice()', docs: mdn('WebHID_API'), summary: 'Raw input reports from HID devices: keyboards, 3D mice, controllers.', present: () => nav('hid'), secureOnly: true, policy: 'hid', where: CHROMIUM_DESKTOP },
  { id: 'midi', name: 'Web MIDI', category: 'peripherals', surface: 'navigator.requestMIDIAccess()', docs: mdn('Web_MIDI_API'), summary: 'Live messages from MIDI keyboards, pads and controllers.', present: () => nav('requestMIDIAccess'), secureOnly: true, policy: 'midi', where: 'Chromium and Firefox.' },
  { id: 'nfc', name: 'Web NFC', category: 'peripherals', surface: 'new NDEFReader().scan()', docs: mdn('Web_NFC_API'), summary: 'Read NDEF tags held against the device.', present: () => has('NDEFReader'), secureOnly: true, where: 'Chrome on Android only.' },

  // Showcase
  { id: 'heart-rate', name: 'Heart-rate monitor', category: 'showcase', surface: "GATT service 'heart_rate' (0x180D)", docs: 'https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/', summary: 'Connect a BLE chest strap or armband and stream BPM and RR intervals, with haptic zone alerts.', present: () => nav('bluetooth'), secureOnly: true, policy: 'bluetooth', where: 'Needs Web Bluetooth.' },
  { id: 'cadence', name: 'Cadence metronome', category: 'showcase', surface: 'AudioContext + navigator.vibrate', docs: mdn('Web_Audio_API/Advanced_techniques'), summary: 'Web Audio clock-scheduled beats. Set a tempo, steer toward a target heart rate, or match your step cadence.', present: () => has('AudioContext') },
  { id: 'wiggle', name: 'Step & cadence tracker', category: 'showcase', surface: "addEventListener('devicemotion')", docs: mdn('DeviceMotionEvent'), summary: 'Count steps and cadence with peak detection on the acceleration magnitude.', present: () => has('DeviceMotionEvent'), secureOnly: true, policy: 'accelerometer' },
]

export const API_BY_ID = Object.fromEntries(APIS.map(a => [a.id, a])) as Record<string, ApiInfo>

type PolicyDoc = { allowsFeature?: (feature: string) => boolean; features?: () => string[] }

function policyAllows(feature: string): boolean {
  const doc = document as unknown as { permissionsPolicy?: PolicyDoc; featurePolicy?: PolicyDoc }
  const policy = doc.permissionsPolicy ?? doc.featurePolicy
  try {
    // allowsFeature() answers false for names the engine doesn't know, so only
    // trust it for features this engine actually enforces.
    if (policy?.features && !policy.features().includes(feature)) return true
    return policy?.allowsFeature ? policy.allowsFeature(feature) : true
  } catch {
    // Unknown feature names throw in some engines; treat as not gated.
    return true
  }
}

export function availability(api: ApiInfo): Availability {
  let present = false
  try {
    present = api.present()
  } catch {
    present = false
  }
  if (!present) return api.secureOnly && !window.isSecureContext ? 'insecure' : 'unsupported'
  if (api.policy && !policyAllows(api.policy)) return 'blocked'
  return 'available'
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Available',
  unsupported: 'Not in this browser',
  insecure: 'Needs HTTPS',
  blocked: 'Blocked by policy',
}
