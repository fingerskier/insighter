export type Vec3 = { x: number; y: number; z: number }
/** Quaternion in the Generic Sensor API's [x, y, z, w] order. */
export type Quat = readonly [number, number, number, number]

const DEG = Math.PI / 180

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/** Format a possibly-missing number for display; em dash when absent. */
export function fmt(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(digits)
}

export const magnitude = ({ x, y, z }: Vec3) => Math.hypot(x, y, z)

/**
 * DeviceOrientationEvent alpha/beta/gamma (intrinsic Z-X'-Y'') to a quaternion,
 * per the W3C DeviceOrientation spec's worked example.
 */
export function eulerToQuat(alpha: number, beta: number, gamma: number): Quat {
  const x = (beta || 0) * DEG
  const y = (gamma || 0) * DEG
  const z = (alpha || 0) * DEG
  const cX = Math.cos(x / 2), cY = Math.cos(y / 2), cZ = Math.cos(z / 2)
  const sX = Math.sin(x / 2), sY = Math.sin(y / 2), sZ = Math.sin(z / 2)
  return [
    sX * cY * cZ - cX * sY * sZ,
    cX * sY * cZ + sX * cY * sZ,
    cX * cY * sZ + sX * sY * cZ,
    cX * cY * cZ - sX * sY * sZ,
  ]
}

/** Tait-Bryan angles (degrees) from a quaternion: yaw about Z, pitch about X, roll about Y. */
export function quatToEuler([x, y, z, w]: Quat) {
  const yaw = Math.atan2(2 * (w * z - x * y), 1 - 2 * (x * x + z * z))
  const pitch = Math.asin(clamp(2 * (w * x + y * z), -1, 1))
  const roll = Math.atan2(2 * (w * y - x * z), 1 - 2 * (x * x + y * y))
  return { yaw: yaw / DEG, pitch: pitch / DEG, roll: roll / DEG }
}

/** Rotation matrix (row-major 3x3) for a unit quaternion. */
export function quatToMatrix([x, y, z, w]: Quat): number[][] {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ]
}

/**
 * CSS matrix3d() for a device-frame quaternion. The device frame is y-up; CSS is
 * y-down, so conjugate by diag(1, -1, 1) before emitting column-major values.
 */
export function quatToCssMatrix(q: Quat): string {
  const m = quatToMatrix(q)
  const s = [1, -1, 1]
  const c = (r: number, col: number) => s[r] * s[col] * m[r][col]
  const values = [
    c(0, 0), c(1, 0), c(2, 0), 0,
    c(0, 1), c(1, 1), c(2, 1), 0,
    c(0, 2), c(1, 2), c(2, 2), 0,
    0, 0, 0, 1,
  ]
  return `matrix3d(${values.map(v => +v.toFixed(6)).join(',')})`
}

/** Compass heading (degrees clockwise from magnetic north) for a device lying flat. */
export function headingFromMagnetometer(x: number, y: number): number {
  const heading = Math.atan2(-x, y) / DEG
  return (heading + 360) % 360
}

export type LatLng = { latitude: number; longitude: number }

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371e3
  const φ1 = a.latitude * DEG
  const φ2 = b.latitude * DEG
  const Δφ = (b.latitude - a.latitude) * DEG
  const Δλ = (b.longitude - a.longitude) * DEG
  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/** Local east/north offset in metres of `p` from `origin` (equirectangular; fine for walks). */
export function toLocalMetres(origin: LatLng, p: LatLng) {
  const R = 6371e3
  return {
    east: (p.longitude - origin.longitude) * DEG * R * Math.cos(origin.latitude * DEG),
    north: (p.latitude - origin.latitude) * DEG * R,
  }
}

const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

/** Nearest equal-tempered note (A4 = 440 Hz) and the offset from it in cents. */
export function frequencyToNote(hz: number) {
  if (!(hz > 0)) return undefined
  const midi = 69 + 12 * Math.log2(hz / 440)
  const nearest = Math.round(midi)
  return {
    name: NOTES[((nearest % 12) + 12) % 12],
    octave: Math.floor(nearest / 12) - 1,
    cents: Math.round((midi - nearest) * 100),
  }
}
