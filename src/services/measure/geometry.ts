import type { LengthUnit } from '../units'
import { MM_PER_UNIT } from '../units'

export interface Point {
  x: number
  y: number
}

export interface Segment {
  a: Point
  b: Point
}

export interface Size {
  width: number
  height: number
}

export interface ReferencePreset {
  id: string
  label: string
  length: number
  unit: LengthUnit
}

// Standard sizes of everyday flat objects that can be laid next to a package.
export const REFERENCE_PRESETS: readonly ReferencePreset[] = [
  {
    id: 'letter-long',
    label: 'US Letter paper, long side',
    length: 11,
    unit: 'in',
  },
  {
    id: 'letter-short',
    label: 'US Letter paper, short side',
    length: 8.5,
    unit: 'in',
  },
  { id: 'a4-long', label: 'A4 paper, long side', length: 297, unit: 'mm' },
  { id: 'a4-short', label: 'A4 paper, short side', length: 210, unit: 'mm' },
  { id: 'card-long', label: 'Bank card, long side', length: 85.6, unit: 'mm' },
  {
    id: 'card-short',
    label: 'Bank card, short side',
    length: 53.98,
    unit: 'mm',
  },
]

export const DEFAULT_PRESET_ID = 'letter-long'

/** A reference marked shorter than this many image pixels is too small to scale from. */
export const MIN_REFERENCE_PIXELS = 20

/** Measurements allowed per photo, in addition to the reference. */
export const MAX_MEASUREMENTS = 6

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Millimetres per image pixel from a marked reference of known length, or
 * null when there is no trustworthy scale.
 */
export function millimetresPerPixel(
  reference: Segment,
  length: number,
  unit: LengthUnit,
): number | null {
  const pixels = distance(reference.a, reference.b)
  if (!Number.isFinite(length) || length <= 0) return null
  if (pixels < MIN_REFERENCE_PIXELS) return null
  return (length * MM_PER_UNIT[unit]) / pixels
}

export function lengthInUnit(
  segment: Segment,
  mmPerPixel: number,
  unit: LengthUnit,
): number {
  return (distance(segment.a, segment.b) * mmPerPixel) / MM_PER_UNIT[unit]
}

/**
 * A short reference magnifies every error in the estimate, so the person is
 * warned when it spans under a tenth of the photo's longer side.
 */
export function isReferenceShort(reference: Segment, image: Size): boolean {
  return (
    distance(reference.a, reference.b) <
    Math.max(image.width, image.height) * 0.1
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Converts a pointer position on the displayed photo to image pixel coordinates. */
export function clientToImagePoint(
  client: Point,
  rect: { left: number; top: number; width: number; height: number },
  image: Size,
): Point | null {
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    x: clamp(
      ((client.x - rect.left) / rect.width) * image.width,
      0,
      image.width,
    ),
    y: clamp(
      ((client.y - rect.top) / rect.height) * image.height,
      0,
      image.height,
    ),
  }
}

/** The index of the point closest to the target, if one is within maxDistance. */
export function nearestPointIndex(
  points: readonly Point[],
  target: Point,
  maxDistance: number,
): number | null {
  let nearest: number | null = null
  let nearestDistance = maxDistance
  for (const [index, point] of points.entries()) {
    const gap = distance(point, target)
    if (gap <= nearestDistance) {
      nearest = index
      nearestDistance = gap
    }
  }
  return nearest
}

/** Groups points into consecutive pairs, starting at the given index. Ignores a trailing odd point. */
export function pairUp(points: readonly Point[], from = 0): Segment[] {
  const segments: Segment[] = []
  for (let index = from; index + 1 < points.length; index += 2) {
    const a = points[index]
    const b = points[index + 1]
    if (a && b) segments.push({ a, b })
  }
  return segments
}

/** Reads a length typed by a person: digits with an optional decimal point or comma. */
export function parseLength(text: string): number | null {
  const trimmed = text.trim()
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null
  const value = Number(trimmed.replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : null
}

export function formatLength(value: number): string {
  return value.toFixed(1)
}
