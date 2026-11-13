import type { Size } from '../measure/geometry'

export interface CapturedImage {
  blob: Blob
  /** Object URL for showing the photo. Release it with `releaseImage`. */
  url: string
  width: number
  height: number
}

/** Longest side kept. Larger photos are scaled down so reading stays quick on a tablet. */
export const MAX_IMAGE_SIDE = 2560

/** Live frames are smaller still, because one is read every second or so. */
export const LIVE_FRAME_SIDE = 1280

const JPEG_QUALITY = 0.92
const LIVE_JPEG_QUALITY = 0.85

export class ImageError extends Error {
  override name = 'ImageError'
}

export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): Size {
  const longest = Math.max(width, height)
  if (longest <= maxSide) return { width, height }

  const scale = maxSide / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

async function render(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxSide: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = fitWithin(sourceWidth, sourceHeight, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context)
    throw new ImageError('This browser could not prepare the photo.')

  // JPEG has no transparency, so transparent areas of a PNG would turn black.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
  if (!blob) throw new ImageError('This browser could not prepare the photo.')

  return { blob, width, height }
}

async function encode(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): Promise<CapturedImage> {
  const image = await render(
    source,
    sourceWidth,
    sourceHeight,
    MAX_IMAGE_SIDE,
    JPEG_QUALITY,
  )
  return { ...image, url: URL.createObjectURL(image.blob) }
}

/** Decodes a chosen file, applies its camera rotation and scales it down. */
export async function imageFromFile(file: Blob): Promise<CapturedImage> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageError(
      'That file could not be opened as a photo. Choose a JPEG or PNG image.',
    )
  }

  try {
    return await encode(bitmap, bitmap.width, bitmap.height)
  } finally {
    bitmap.close()
  }
}

/** Freezes the current frame of a playing camera preview. */
export function imageFromVideo(
  video: HTMLVideoElement,
): Promise<CapturedImage> {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return Promise.reject(new ImageError('The camera is not ready yet.'))
  }
  return encode(video, video.videoWidth, video.videoHeight)
}

/**
 * Takes the current frame of a playing camera preview to be read live. Unlike
 * a photo it is smaller and has no URL to release.
 */
export async function frameFromVideo(video: HTMLVideoElement): Promise<Blob> {
  if (
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    throw new ImageError('The camera is not ready yet.')
  }

  const { blob } = await render(
    video,
    video.videoWidth,
    video.videoHeight,
    LIVE_FRAME_SIDE,
    LIVE_JPEG_QUALITY,
  )
  return blob
}

export function releaseImage(image: CapturedImage): void {
  URL.revokeObjectURL(image.url)
}
