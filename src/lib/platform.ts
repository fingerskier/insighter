/**
 * Typings for APIs that lib.dom does not (yet) describe. They are local names
 * reached through casts, so they can never collide with future lib.dom types.
 */

export type BatteryLike = EventTarget & {
  level: number
  charging: boolean
  chargingTime: number
  dischargingTime: number
}

export type ConnectionLike = EventTarget & {
  effectiveType?: string
  type?: string
  downlink?: number
  downlinkMax?: number
  rtt?: number
  saveData?: boolean
}

export type UADataLike = {
  brands: { brand: string; version: string }[]
  mobile: boolean
  platform: string
  getHighEntropyValues: (hints: string[]) => Promise<Record<string, unknown>>
}

export type GpuAdapterInfoLike = { vendor?: string; architecture?: string; device?: string; description?: string }
export type GpuLike = {
  requestAdapter: () => Promise<{ info?: GpuAdapterInfoLike; features: Set<string>; limits: Record<string, number> } | null>
}

type NavigatorExtras = Navigator & {
  getBattery?: () => Promise<BatteryLike>
  connection?: ConnectionLike
  deviceMemory?: number
  userAgentData?: UADataLike
  gpu?: GpuLike
}

export const navx = () => navigator as NavigatorExtras

export type IdleDetectorLike = EventTarget & {
  userState: 'active' | 'idle' | null
  screenState: 'locked' | 'unlocked' | null
  start: (options: { threshold: number; signal?: AbortSignal }) => Promise<void>
}
export type IdleDetectorCtor = {
  new (): IdleDetectorLike
  requestPermission: () => Promise<PermissionState>
}

export type PressureRecordLike = { source: string; state: 'nominal' | 'fair' | 'serious' | 'critical'; time: number }
export type PressureObserverCtor = new (callback: (records: PressureRecordLike[]) => void) => {
  observe: (source: 'cpu', options?: { sampleInterval?: number }) => Promise<void>
  disconnect: () => void
}

/** iOS 13+ gates motion events behind an explicit, gesture-initiated request. */
export type PermissionGatedEvent = { requestPermission?: () => Promise<'granted' | 'denied'> }

type WindowExtras = Window & {
  IdleDetector?: IdleDetectorCtor
  PressureObserver?: PressureObserverCtor
  webkitAudioContext?: typeof AudioContext
}

export const winx = () => window as WindowExtras

/** Human-readable text for anything a Web API might throw. */
export function describeError(error: unknown): string {
  if (error instanceof DOMException) {
    const hints: Record<string, string> = {
      NotAllowedError: 'Permission was denied or the request needs a tap or click to start.',
      NotFoundError: 'No matching device was found, or the picker was dismissed.',
      NotReadableError: 'The hardware exists but could not be read. It may be missing or in use.',
      SecurityError: 'Blocked by the browser’s security rules for this page.',
      NotSupportedError: 'This device or browser does not support it.',
      AbortError: 'The request was cancelled.',
    }
    const hint = hints[error.name]
    return hint ? `${error.name}: ${hint}${error.message ? ` (${error.message})` : ''}` : `${error.name}: ${error.message}`
  }
  if (error instanceof Error) return error.message
  if (typeof GeolocationPositionError !== 'undefined' && error instanceof GeolocationPositionError) return error.message
  return String(error)
}

/** Query the Permissions API; 'unknown' when the name is not recognised here. */
export async function permissionState(name: string): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({ name } as unknown as PermissionDescriptor)
    return status.state
  } catch {
    return 'unknown'
  }
}
