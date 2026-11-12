import { airlineForPrefix } from './airlinePrefixes'
import type { DraftFinding, FindingSource, ScannedBarcode } from './types'

export interface AwbNumber {
  prefix: string
  /** The seven serial digits, without the check digit. */
  serial: string
  checkDigit: number
  expectedCheckDigit: number
  valid: boolean
  /** Normalized as PPP-SSSSSSSC. */
  display: string
  airline: string | undefined
  raw: string
}

// Three prefix digits, then seven serial digits and one check digit,
// printed as "016-1234 5675", "016 12345675" or "01612345675". The parts must
// share a line, so digits from separate lines are never joined.
const AWB_IN_TEXT = /(?<!\d)(\d{3})[ -]{0,3}(\d{4})[ -]{0,3}(\d{4})(?!\d)/g
const AWB_WHOLE = /^(\d{3})[ -]?(\d{4})[ -]?(\d{4})$/
const AWB_KEYWORD = /AWB|WAYBILL/

function awbFromMatch(match: RegExpMatchArray): AwbNumber | null {
  const [raw, prefix, middle, last] = match
  if (prefix === undefined || middle === undefined || last === undefined) {
    return null
  }
  const serial = middle + last.slice(0, 3)
  const checkDigit = Number(last.slice(3))
  const expectedCheckDigit = Number(serial) % 7
  return {
    prefix,
    serial,
    checkDigit,
    expectedCheckDigit,
    valid: checkDigit === expectedCheckDigit,
    display: `${prefix}-${serial}${checkDigit}`,
    airline: airlineForPrefix(prefix),
    raw,
  }
}

/**
 * Finds air waybill numbers in normalized text. A number whose check digit
 * fails is kept only when something else suggests it really is an air waybill:
 * a known airline prefix, or the words "AWB" or "waybill" just before it.
 * That keeps other 11-digit numbers from being reported.
 */
export function awbsFromText(text: string): AwbNumber[] {
  const found = new Map<string, AwbNumber>()
  for (const match of text.matchAll(AWB_IN_TEXT)) {
    const awb = awbFromMatch(match)
    if (!awb || found.has(awb.display)) continue
    const start = match.index
    const before = text.slice(Math.max(0, start - 24), start)
    if (awb.valid || awb.airline !== undefined || AWB_KEYWORD.test(before)) {
      found.set(awb.display, awb)
    }
  }
  return [...found.values()]
}

/**
 * Replaces anything shaped like an air waybill number, so its trailing digits
 * cannot be mistaken for a piece count, weight or size next to it.
 */
export function maskAwbNumbers(text: string): string {
  return text.replace(AWB_IN_TEXT, '[AWB]')
}

/**
 * A barcode counts as an air waybill only when its whole content is a number
 * of that shape with a correct check digit. Anything else stays a raw barcode.
 */
export function awbFromBarcode(text: string): AwbNumber | null {
  const match = AWB_WHOLE.exec(text.trim())
  const awb = match ? awbFromMatch(match) : null
  return awb?.valid ? awb : null
}

function describeAwb(
  awb: AwbNumber,
  sources: readonly FindingSource[],
): DraftFinding {
  const airline =
    awb.airline === undefined
      ? `Airline prefix ${awb.prefix} is not in the built-in list.`
      : `Airline prefix ${awb.prefix} is ${awb.airline}.`

  if (awb.valid) {
    return {
      category: 'awb',
      title: `Air waybill ${awb.display}`,
      detail: `${airline} The check digit (${awb.checkDigit}) is correct, so the number is well formed. That does not confirm the shipment exists.`,
      tone: 'ok',
      sources,
      raw: awb.raw,
    }
  }
  return {
    category: 'awb',
    title: `Possible air waybill ${awb.display}`,
    detail: `${airline} The check digit is ${awb.checkDigit} but ${awb.expectedCheckDigit} was expected, so a digit may have been misread. Compare it with the label.`,
    tone: 'caution',
    sources,
    raw: awb.raw,
  }
}

export function awbFindings(
  text: string,
  barcodes: readonly ScannedBarcode[],
): DraftFinding[] {
  const found = new Map<
    string,
    { awb: AwbNumber; sources: Set<FindingSource> }
  >()
  const add = (awb: AwbNumber, source: FindingSource) => {
    const entry = found.get(awb.display) ?? { awb, sources: new Set() }
    entry.sources.add(source)
    found.set(awb.display, entry)
  }

  for (const barcode of barcodes) {
    const awb = awbFromBarcode(barcode.text)
    if (awb) add(awb, 'barcode')
  }
  for (const awb of awbsFromText(text)) add(awb, 'text')

  return [...found.values()].map(({ awb, sources }) =>
    describeAwb(awb, [...sources]),
  )
}
