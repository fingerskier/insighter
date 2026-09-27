/**
 * Parse a Heart Rate Measurement characteristic (0x2A37) value.
 * Flags byte: bit0 = uint16 BPM, bits1-2 = sensor contact, bit3 = energy
 * expended present, bit4 = RR intervals present (1/1024 s units).
 */
export function parseHeartRate(view: DataView) {
  const flags = view.getUint8(0)
  const wide = flags & 0x01
  let offset = 1
  const bpm = wide ? view.getUint16(offset, true) : view.getUint8(offset)
  offset += wide ? 2 : 1

  const contactSupported = !!(flags & 0x04)
  const contact = contactSupported ? !!(flags & 0x02) : undefined

  let energy: number | undefined
  if (flags & 0x08) {
    energy = view.getUint16(offset, true)
    offset += 2
  }

  const rr: number[] = []
  if (flags & 0x10) {
    for (; offset + 1 < view.byteLength; offset += 2) rr.push((view.getUint16(offset, true) / 1024) * 1000)
  }

  return { bpm, contact, energy, rr }
}

export type HeartRateSample = ReturnType<typeof parseHeartRate>
