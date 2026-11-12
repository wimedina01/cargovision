import { fitWithin } from './images'

export interface Tilt {
  /** Degrees to turn the photo clockwise to bring its lines of text level. */
  angle: number
  /** How much sharper the lines of text get once level. 1 means no change. */
  gain: number
}

/** Longest side of the small copy that is searched for a tilt. */
const ANALYSIS_SIDE = 700
/** Steepest tilt searched for, in degrees either way. */
const MAX_TILT = 15
/** Smaller tilts, and ones that barely sharpen the lines, are left alone. */
const MIN_TILT = 0.5
const MIN_GAIN = 1.05
/** A pixel counts as ink when it is this much darker than its surroundings. */
const INK_DROP = 0.15
/** Fewer ink pixels than this is not enough to judge a tilt by. */
const MIN_INK = 200
/** Busier photos are sampled so that a slow tablet still answers quickly. */
const MAX_INK = 60_000
const JPEG_QUALITY = 0.95

interface Ink {
  xs: Uint16Array
  ys: Uint16Array
  count: number
}

function valueAt(values: ArrayLike<number>, index: number): number {
  return values[index] ?? 0
}

/** Finds the pixels that are clearly darker than their surroundings. */
function findInk(gray: Uint8ClampedArray, width: number, height: number): Ink {
  const reach = Math.max(2, Math.round(Math.min(width, height) * 0.05))

  // Running totals make the average around each pixel cheap to look up.
  const stride = width + 1
  const sums = new Uint32Array(stride * (height + 1))
  for (let y = 0; y < height; y++) {
    let row = 0
    for (let x = 0; x < width; x++) {
      row += valueAt(gray, y * width + x)
      sums[(y + 1) * stride + x + 1] = valueAt(sums, y * stride + x + 1) + row
    }
  }

  const xs = new Uint16Array(width * height)
  const ys = new Uint16Array(width * height)
  let count = 0
  for (let y = 0; y < height; y++) {
    const top = Math.max(0, y - reach)
    const bottom = Math.min(height - 1, y + reach)
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - reach)
      const right = Math.min(width - 1, x + reach)
      const area = (right - left + 1) * (bottom - top + 1)
      const sum =
        valueAt(sums, (bottom + 1) * stride + right + 1) -
        valueAt(sums, top * stride + right + 1) -
        valueAt(sums, (bottom + 1) * stride + left) +
        valueAt(sums, top * stride + left)
      if (valueAt(gray, y * width + x) * area < sum * (1 - INK_DROP)) {
        xs[count] = x
        ys[count] = y
        count += 1
      }
    }
  }
  return { xs, ys, count }
}

/**
 * Slides the ink along lines of the given slope and counts it row by row.
 * The counts are lumpiest, and so score highest, when the lines of text
 * run along that slope.
 */
function sharpness(
  ink: Ink,
  width: number,
  height: number,
  degrees: number,
): number {
  const slope = Math.tan((degrees * Math.PI) / 180)
  const offset = Math.ceil(Math.abs(slope) * width)
  const rows = new Uint32Array(height + 2 * offset + 2)
  const step = Math.max(1, Math.ceil(ink.count / MAX_INK))
  for (let i = 0; i < ink.count; i += step) {
    const row =
      Math.round(valueAt(ink.ys, i) + valueAt(ink.xs, i) * slope) + offset
    rows[row] = valueAt(rows, row) + 1
  }

  let total = 0
  for (const count of rows) total += count * count
  return total
}

/**
 * Finds how far lines of text in a grayscale picture lean from level. It
 * works for tilts up to about 15 degrees, and reports no tilt when there is
 * too little text to judge by.
 */
export function estimateTilt(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
): Tilt {
  const ink = findInk(gray, width, height)
  if (ink.count < MIN_INK) return { angle: 0, gain: 1 }

  const level = sharpness(ink, width, height, 0)
  let best = { angle: 0, value: level }
  const consider = (angle: number) => {
    const value = sharpness(ink, width, height, angle)
    if (value > best.value) best = { angle, value }
  }

  for (let half = -MAX_TILT * 2; half <= MAX_TILT * 2; half++)
    consider(half / 2)
  const coarse = best.angle
  for (let tenth = -5; tenth <= 5; tenth++) consider(coarse + tenth / 10)

  return { angle: Math.round(best.angle * 10) / 10, gain: best.value / level }
}

function measureTilt(bitmap: ImageBitmap): Tilt | null {
  const { width, height } = fitWithin(
    bitmap.width,
    bitmap.height,
    ANALYSIS_SIDE,
  )
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  context.drawImage(bitmap, 0, 0, width, height)
  const { data } = context.getImageData(0, 0, width, height)
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] =
      0.299 * valueAt(data, p) +
      0.587 * valueAt(data, p + 1) +
      0.114 * valueAt(data, p + 2)
  }
  return estimateTilt(gray, width, height)
}

/** Turns the photo clockwise, on a canvas grown to keep every corner. */
function turn(bitmap: ImageBitmap, degrees: number): Promise<Blob | null> {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const width = Math.ceil(bitmap.width * cos + bitmap.height * sin)
  const height = Math.ceil(bitmap.width * sin + bitmap.height * cos)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)

  // The corners the turn uncovers should read as blank paper.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingQuality = 'high'
  context.translate(width / 2, height / 2)
  context.rotate(radians)
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  })
}

async function levelled(photo: Blob): Promise<Blob | null> {
  const bitmap = await createImageBitmap(photo)
  try {
    const tilt = measureTilt(bitmap)
    if (
      tilt === null ||
      Math.abs(tilt.angle) < MIN_TILT ||
      tilt.gain < MIN_GAIN
    ) {
      return null
    }
    return await turn(bitmap, tilt.angle)
  } finally {
    bitmap.close()
  }
}

/**
 * Turns a photo of a label until its lines of text run level, because the
 * text reader misses the ends of lines that slope. Gives back the same photo
 * when it is already level, has too little text to judge, or cannot be
 * analysed here. It never fails.
 */
export async function levelText(photo: Blob): Promise<Blob> {
  try {
    return (await levelled(photo)) ?? photo
  } catch {
    return photo
  }
}
