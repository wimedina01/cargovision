import { useEffect, useState } from 'react'
import { startLiveReader } from '../services/vision/liveReader'
import type { LabelReading } from '../services/vision/readLabel'

export interface LiveReading {
  /** The newest reading, or null until the first one finishes. */
  reading: LabelReading | null
  /** True once reading failed repeatedly and was given up on. */
  unavailable: boolean
}

const waiting: LiveReading = { reading: null, unavailable: false }

/**
 * Reads the label in front of a camera preview for as long as there is one
 * and `paused` is false. Pausing, or the preview going away, clears the
 * reading so that an old one is never shown against a different view.
 */
export function useLiveReading(
  video: HTMLVideoElement | null,
  paused: boolean,
): LiveReading {
  const [live, setLive] = useState(waiting)

  useEffect(() => {
    if (!video || paused) return undefined

    const stop = startLiveReader(video, {
      onReading: (reading) => {
        setLive({ reading, unavailable: false })
      },
      onUnavailable: () => {
        setLive({ reading: null, unavailable: true })
      },
    })

    return () => {
      stop()
      setLive(waiting)
    }
  }, [video, paused])

  return live
}
