import { afterEach, describe, expect, it, vi } from 'vitest'
import { estimateTilt, levelText } from './deskew'

const WIDTH = 360
const HEIGHT = 240

/**
 * Five rows of dark dashes, like words, on white paper. A positive tilt
 * raises the right-hand end of each row.
 */
function page(tiltDegrees: number): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(WIDTH * HEIGHT).fill(255)
  const slope = Math.tan((tiltDegrees * Math.PI) / 180)
  for (let row = 0; row < 5; row++) {
    for (let x = 20; x < WIDTH - 20; x++) {
      if (x % 24 >= 18) continue
      const top = Math.round(40 + row * 40 - (x - WIDTH / 2) * slope)
      for (let thickness = 0; thickness < 6; thickness++) {
        gray[(top + thickness) * WIDTH + x] = 0
      }
    }
  }
  return gray
}

describe('estimateTilt', () => {
  it('finds level text level', () => {
    const { angle } = estimateTilt(page(0), WIDTH, HEIGHT)

    expect(Math.abs(angle)).toBeLessThan(0.3)
  })

  it.each([3, -4, 8, -12])(
    'measures text that leans by %d degrees',
    (degrees) => {
      const { angle, gain } = estimateTilt(page(degrees), WIDTH, HEIGHT)

      expect(Math.abs(angle - degrees)).toBeLessThan(0.3)
      expect(gain).toBeGreaterThan(1.05)
    },
  )

  it('reports no tilt when there is no text to judge by', () => {
    const blank = new Uint8ClampedArray(WIDTH * HEIGHT).fill(200)

    expect(estimateTilt(blank, WIDTH, HEIGHT)).toEqual({ angle: 0, gain: 1 })
  })
})

describe('levelText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const photo = new Blob(['photo'])

  it('keeps the photo as it is when the browser cannot decode it', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('decode failed')),
    )

    await expect(levelText(photo)).resolves.toBe(photo)
  })

  it('keeps the photo as it is when the browser cannot analyse images', async () => {
    await expect(levelText(photo)).resolves.toBe(photo)
  })
})
