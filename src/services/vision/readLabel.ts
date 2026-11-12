import { interpretLabel } from '../labels/interpret'
import type { Finding, ScannedBarcode } from '../labels/types'
import { readBarcodes } from './barcodes'
import {
  OcrCancelledError,
  OcrUnavailableError,
  cancelOcr,
  recognizeText,
} from './ocr'

export type ReadProgress =
  | { stage: 'barcodes' }
  /** `fraction` is null until the reader reports how far along it is. */
  | { stage: 'text'; fraction: number | null }

export interface LabelReading {
  barcodes: ScannedBarcode[]
  text: string
  /** Mean text confidence, 0 to 100, or null when no text was read. */
  confidence: number | null
  findings: Finding[]
  /** Set when a reader failed. The other reader's results are still returned. */
  barcodeProblem: string | null
  textProblem: string | null
}

export interface ReadOptions {
  signal?: AbortSignal
  onProgress?: (progress: ReadProgress) => void
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new OcrCancelledError('Reading was cancelled.')
}

/**
 * Reads the barcodes and printed text in a photo, then explains what they
 * mean. Barcodes go first because they are quick. If the signal aborts, the
 * returned promise rejects and any text reading in progress is stopped.
 */
export async function readLabel(
  image: Blob,
  { signal, onProgress }: ReadOptions = {},
): Promise<LabelReading> {
  throwIfAborted(signal)

  const stop = () => {
    cancelOcr()
  }
  signal?.addEventListener('abort', stop, { once: true })

  try {
    onProgress?.({ stage: 'barcodes' })
    let barcodes: ScannedBarcode[] = []
    let barcodeProblem: string | null = null
    try {
      barcodes = await readBarcodes(image)
    } catch {
      barcodeProblem = 'Barcodes could not be read from this photo.'
    }
    throwIfAborted(signal)

    onProgress?.({ stage: 'text', fraction: null })
    let text = ''
    let confidence: number | null = null
    let textProblem: string | null = null
    try {
      const result = await recognizeText(image, (fraction) => {
        onProgress?.({ stage: 'text', fraction })
      })
      text = result.text
      confidence = result.confidence
    } catch (error) {
      if (error instanceof OcrCancelledError) throw error
      textProblem =
        error instanceof OcrUnavailableError
          ? 'This browser cannot read printed text. Barcodes and measuring still work.'
          : 'Printed text could not be read from this photo.'
    }
    throwIfAborted(signal)

    return {
      barcodes,
      text,
      confidence,
      findings: interpretLabel({ text, barcodes }),
      barcodeProblem,
      textProblem,
    }
  } finally {
    signal?.removeEventListener('abort', stop)
  }
}
