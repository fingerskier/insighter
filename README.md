# Insighter

**What can this browser sense?** Insighter detects every device-facing Web API your browser exposes and visualizes each one live: motion, orientation, light, location, sound, camera, power, network, input and peripherals.

Live: <https://fingerskier.github.io/insighter>

Every API gets a card that either works or explains why it can't:

| Status | Meaning |
|---|---|
| ● Available | Exposed and allowed here. Tap **Start** to begin. |
| ○ Not in this browser | This engine doesn't implement it. The card says which browsers do. |
| ⚿ Needs HTTPS | The API only exists in secure contexts. |
| ⊘ Blocked by policy | A `Permissions-Policy` disables it for this page. |

Nothing leaves the device. Every reading is processed in the tab.

## What's covered

| Category | APIs |
|---|---|
| Motion & orientation | DeviceOrientation/DeviceMotion events (incl. iOS permission flow), Accelerometer, LinearAcceleration, Gravity, Gyroscope, Magnetometer, Absolute/Relative orientation. 3D device model, compass, spirit level and live charts. |
| Environment | Ambient light, Compute Pressure, Ambient temperature (a known negative for detection) |
| Location | Geolocation: fix, accuracy, speed, heading, distance and a north-up track |
| Camera & microphone | Mic level, spectrum and pitch (Web Audio). Camera preview, track settings, torch, and scene brightness. Media-device enumeration. |
| Device & system | Pointer/pen/touch (pressure, tilt, twist), screen & media features, battery, network, gamepad (sticks, buttons, rumble), vibration, wake lock, idle detection, page lifecycle, hardware/GPU/client hints |
| Peripherals | Web Bluetooth GATT explorer, Web Serial terminal, WebUSB descriptors, WebHID input reports, Web MIDI, Web NFC |
| Showcase | BLE heart-rate monitor (BPM, RR, zone haptics). Web Audio metronome that can steer toward a target heart rate or lock to your step cadence. Step & cadence tracker. |

Most sensors need a phone. Desktop browsers usually expose the motion APIs without hardware behind them, and the cards say so.

## Development

```sh
npm install
npm run dev        # http://localhost:5173/insighter/ (localhost counts as a secure context)
npm test           # unit tests for the math, step detection and BLE parsing
npm run build      # typecheck + production build with service worker
npm run deploy     # manual publish of dist/ to the gh-pages branch
```

Pushes to `main` deploy automatically: `.github/workflows/pages.yml` tests, builds and publishes `dist/` to the `gh-pages` branch, which GitHub Pages serves. Pull requests run the same tests and build without deploying.

To try phone sensors against the dev server you need HTTPS. Use `npx vite --host` behind a tunnel, or Chrome's remote debugging port forwarding (`chrome://inspect` → Port forwarding), which serves it as `localhost` on the phone.

Stack: Vite, React 19, TypeScript and vite-plugin-pwa (installable and offline-capable). There are no runtime dependencies beyond React.

### Layout

```
src/lib/support.ts   API registry + availability detection (the capability map)
src/lib/sources.ts   subscribe functions for every streaming source
src/hooks/useStream  start/stop, errors, frame-throttled state, ring-buffer series
src/components/      Panel card, stats, canvas time-series, compass, 3D model, …
src/panels/          one file per category
```

To add an API, register it in `APIS` in `support.ts`, write a panel wrapped in `<Panel id="…">`, and add the panel to its category in `App.tsx`.
