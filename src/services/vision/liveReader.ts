import { frameFromVideo } from '../image/images'
import { OcrCancelledError } from './ocr'
import { readLabel } from './readLabel'
import type { LabelReading } from './readLabel'

export interface LiveReaderCallbacks {
  /** Called with each finished reading. */
  onReading: (reading: LabelReading) => void
  /** Called once if reads keep failing. The reader stops after it. */
  onUnavailable: () => void
}

/** Rest between reads so the tablet is not kept working flat out. */
const MIN_REST_MS = 300
/** A slow read earns a longer rest, as a share of how long it took. */
const REST_SHARE = 0.25
/** How often to look again while the page is hidden or the preview is not playing. */
const WAIT_MS = 500
/** Failed reads in a row before the reader gives up. */
const MAX_FAILURES = 3

function canRead(video: HTMLVideoElement): boolean {
  return (
    document.visibilityState === 'visible' &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    !video.paused &&
    !video.ended
  )
}

/**
 * Reads the label in front of a camera preview over and over, one frame at a
 * time, until the returned function is called. Frames are read without being
 * turned level, which keeps each read quick and the screen responsive. Reading
 * waits while the page is hidden.
 */
export function startLiveReader(
  video: HTMLVideoElement,
  { onReading, onUnavailable }: LiveReaderCallbacks,
): () => void {
  const controller = new AbortController()
  const { signal } = controller

  function rest(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const wake = () => {
        clearTimeout(timer)
        signal.removeEventListener('abort', wake)
        resolve()
      }
      const timer = setTimeout(wake, ms)
      signal.addEventListener('abort', wake)
    })
  }

  async function run(): Promise<void> {
    let failures = 0

    while (!signal.aborted) {
      if (!canRead(video)) {
        await rest(WAIT_MS)
        continue
      }

      const started = performance.now()
      try {
        const frame = await frameFromVideo(video)
        if (signal.aborted) return
        const reading = await readLabel(frame, { level: false })
        if (signal.aborted) return

        // With neither reader working there is nothing to show for this frame.
        if (reading.barcodeProblem !== null && reading.textProblem !== null) {
          throw new Error('Neither reader could read the frame.')
        }
        failures = 0
        onReading(reading)
      } catch (error) {
        if (signal.aborted) return
        // The text reader being stopped by someone else is not a failed read.
        if (!(error instanceof OcrCancelledError)) failures += 1
        if (failures >= MAX_FAILURES) {
          console.error(
            'CargoVision stopped live reading after repeated failures.',
            error,
          )
          onUnavailable()
          return
        }
      }

      await rest(
        Math.max(MIN_REST_MS, (performance.now() - started) * REST_SHARE),
      )
    }
  }

  void run()

  return () => {
    controller.abort()
  }
}
