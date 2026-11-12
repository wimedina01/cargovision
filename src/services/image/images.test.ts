import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageError, fitWithin, imageFromFile, imageFromVideo } from './images'

describe('fitWithin', () => {
  it('keeps an image that already fits', () => {
    expect(fitWithin(1920, 1080, 2560)).toEqual({ width: 1920, height: 1080 })
  })

  it('scales a landscape image down by its longer side', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
  })

  it('scales a portrait image down by its longer side', () => {
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 })
  })

  it('never shrinks a thin image to zero pixels', () => {
    expect(fitWithin(10000, 1, 2000)).toEqual({ width: 2000, height: 1 })
  })
})

describe('imageFromFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('explains when a file cannot be opened as a photo', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('decode failed')),
    )

    await expect(imageFromFile(new Blob(['not an image']))).rejects.toThrow(
      ImageError,
    )
  })
})

describe('imageFromVideo', () => {
  it('refuses a preview that has not produced a frame yet', async () => {
    const video = document.createElement('video')

    await expect(imageFromVideo(video)).rejects.toThrow('not ready')
  })
})
