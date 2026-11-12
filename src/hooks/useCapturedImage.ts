import { useEffect, useState } from 'react'
import { releaseImage } from '../services/image/images'
import type { CapturedImage } from '../services/image/images'

/** Holds the current photo and frees its memory when it is replaced or the page closes. */
export function useCapturedImage() {
  const [image, setImage] = useState<CapturedImage | null>(null)

  useEffect(() => {
    if (!image) return undefined
    return () => {
      releaseImage(image)
    }
  }, [image])

  return [image, setImage] as const
}
