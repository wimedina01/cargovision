import { describe, expect, it } from 'vitest'
import {
  clientToImagePoint,
  distance,
  isReferenceShort,
  lengthInUnit,
  millimetresPerPixel,
  nearestPointIndex,
  pairUp,
  parseLength,
} from './geometry'

const seg = (ax: number, ay: number, bx: number, by: number) => ({
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
})

describe('millimetresPerPixel', () => {
  it('scales from a reference of known length', () => {
    // An 11 in long side marked across 1100 px: 25.4 * 11 / 1100 mm per px.
    const scale = millimetresPerPixel(seg(100, 200, 1200, 200), 11, 'in')
    expect(scale).toBeCloseTo(0.254, 6)
  })

  it('works along any direction', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    expect(millimetresPerPixel(seg(0, 0, 300, 400), 297, 'mm')).toBeCloseTo(
      0.594,
      6,
    )
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'gives no scale for a reference length of %s',
    (length) => {
      expect(millimetresPerPixel(seg(0, 0, 500, 0), length, 'mm')).toBeNull()
    },
  )

  it('gives no scale when the reference marks are almost on top of each other', () => {
    expect(millimetresPerPixel(seg(10, 10, 12, 10), 100, 'mm')).toBeNull()
  })
})

describe('lengthInUnit', () => {
  it('converts a measured segment into the requested unit', () => {
    const scale = 0.254
    expect(lengthInUnit(seg(0, 0, 1000, 0), scale, 'mm')).toBeCloseTo(254)
    expect(lengthInUnit(seg(0, 0, 1000, 0), scale, 'cm')).toBeCloseTo(25.4)
    expect(lengthInUnit(seg(0, 0, 1000, 0), scale, 'in')).toBeCloseTo(10)
  })
})

describe('isReferenceShort', () => {
  it('flags a reference under a tenth of the longer side of the photo', () => {
    const image = { width: 2000, height: 1500 }
    expect(isReferenceShort(seg(0, 0, 199, 0), image)).toBe(true)
    expect(isReferenceShort(seg(0, 0, 200, 0), image)).toBe(false)
  })
})

describe('clientToImagePoint', () => {
  const rect = { left: 100, top: 50, width: 500, height: 250 }
  const image = { width: 2000, height: 1000 }

  it('maps a pointer position on the displayed photo to image pixels', () => {
    expect(clientToImagePoint({ x: 350, y: 175 }, rect, image)).toEqual({
      x: 1000,
      y: 500,
    })
  })

  it('keeps points inside the photo', () => {
    expect(clientToImagePoint({ x: 0, y: 1000 }, rect, image)).toEqual({
      x: 0,
      y: 1000,
    })
  })

  it('gives nothing when the photo has no size on screen', () => {
    expect(
      clientToImagePoint({ x: 1, y: 1 }, { ...rect, width: 0 }, image),
    ).toBeNull()
  })
})

describe('nearestPointIndex', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 108, y: 0 },
  ]

  it('picks the closest point within reach', () => {
    expect(nearestPointIndex(points, { x: 106, y: 0 }, 24)).toBe(2)
    expect(nearestPointIndex(points, { x: 3, y: 4 }, 24)).toBe(0)
  })

  it('gives nothing when every point is out of reach', () => {
    expect(nearestPointIndex(points, { x: 50, y: 300 }, 24)).toBeNull()
  })
})

describe('pairUp', () => {
  const points = [0, 1, 2, 3, 4].map((n) => ({ x: n, y: n }))

  it('pairs points in order and ignores an unfinished pair', () => {
    expect(pairUp(points)).toHaveLength(2)
    expect(pairUp(points, 1)).toHaveLength(2)
    expect(pairUp(points, 2)[0]).toEqual({ a: points[2], b: points[3] })
    expect(pairUp(points, 4)).toEqual([])
  })
})

describe('parseLength', () => {
  it.each([
    ['11', 11],
    ['8.5', 8.5],
    ['8,5', 8.5],
    [' 297 ', 297],
    ['.5', 0.5],
    ['12.', 12],
  ])('reads %j', (typed, value) => {
    expect(parseLength(typed)).toBe(value)
  })

  it.each(['', '0', '0.0', '-5', 'abc', '1.2.3', '1e3', '5 in', '1,000.5'])(
    'rejects %j',
    (typed) => {
      expect(parseLength(typed)).toBeNull()
    },
  )
})
