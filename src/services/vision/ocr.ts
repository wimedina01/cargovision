import type { Worker as TesseractWorker } from 'tesseract.js'

export interface OcrResult {
  text: string
  /** Mean word confidence reported by the reader, 0 to 100. */
  confidence: number
}

export class OcrCancelledError extends Error {
  override name = 'OcrCancelledError'
}

export class OcrUnavailableError extends Error {
  override name = 'OcrUnavailableError'
}

// Served by the ocrAssets Vite plugin and precached for offline use.
const assetBase = `${import.meta.env.BASE_URL}ocr`

// A minimal module that only validates when the browser supports WebAssembly
// SIMD, which the bundled text-reading core requires.
const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8,
  0, 65, 0, 253, 15, 253, 98, 11,
])

let generation = 0
let starting: Promise<TesseractWorker> | undefined
let progressListener: ((fraction: number) => void) | undefined
const cancelHandlers = new Set<(reason: Error) => void>()

function toError(reason: unknown): Error {
  if (reason instanceof Error) return reason
  if (typeof reason === 'string' && reason !== '') return new Error(reason)
  return new Error('The text reader stopped unexpectedly.')
}

function supportsWasmSimd(): boolean {
  return typeof WebAssembly === 'object' && WebAssembly.validate(SIMD_PROBE)
}

async function startWorker(startedIn: number): Promise<TesseractWorker> {
  if (!supportsWasmSimd()) {
    throw new OcrUnavailableError(
      'This browser cannot run the on-device text reader.',
    )
  }

  const { createWorker } = await import('tesseract.js')

  // If the language data fails to load, createWorker never settles. It does
  // call errorHandler, so race against that to fail instead of hanging.
  let fail: (error: Error) => void = () => undefined
  const failed = new Promise<never>((_resolve, reject) => {
    fail = reject
  })

  const worker = await Promise.race([
    createWorker('eng', undefined, {
      workerPath: `${assetBase}/worker.min.js`,
      corePath: `${assetBase}/tesseract-core-simd-lstm.wasm.js`,
      langPath: assetBase,
      cacheMethod: 'none',
      workerBlobURL: false,
      logger: (message) => {
        if (message.status === 'recognizing text') {
          progressListener?.(message.progress)
        }
      },
      errorHandler: (error: unknown) => {
        fail(toError(error))
      },
    }),
    failed,
  ])

  if (startedIn !== generation) {
    void worker.terminate()
    throw new OcrCancelledError('Text reading was cancelled.')
  }

  return worker
}

function readyWorker(): Promise<TesseractWorker> {
  if (!starting) {
    const attempt: Promise<TesseractWorker> = startWorker(generation).catch(
      (error: unknown) => {
        // Let the next call try again rather than caching the failure.
        if (starting === attempt) starting = undefined
        throw toError(error)
      },
    )
    starting = attempt
  }
  return starting
}

/** Settles with the work, or rejects early if `cancelOcr` is called first. */
function untilCancelled<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    cancelHandlers.add(reject)
    void work.then(resolve, reject).finally(() => {
      cancelHandlers.delete(reject)
    })
  })
}

/** Loads the reader ahead of time so the first read starts quickly. */
export async function warmUpOcr(): Promise<void> {
  await untilCancelled(readyWorker())
}

/** Reads the text in a photo. Throws `OcrCancelledError` if cancelled first. */
export async function recognizeText(
  image: Blob,
  onProgress?: (fraction: number) => void,
): Promise<OcrResult> {
  const startedIn = generation
  const worker = await untilCancelled(readyWorker())
  if (startedIn !== generation)
    throw new OcrCancelledError('Text reading was cancelled.')

  progressListener = onProgress
  try {
    const { data } = await untilCancelled(worker.recognize(image))
    return { text: data.text, confidence: data.confidence }
  } finally {
    if (progressListener === onProgress) progressListener = undefined
  }
}

/**
 * Stops any read in progress and frees the reader. A tesseract job cannot be
 * aborted, so the worker is terminated and the next call starts a fresh one.
 */
export function cancelOcr(): void {
  generation += 1
  progressListener = undefined

  const stopping = starting
  starting = undefined
  void stopping?.then(
    (worker) => worker.terminate(),
    () => undefined,
  )

  const error = new OcrCancelledError('Text reading was cancelled.')
  for (const reject of cancelHandlers) reject(error)
  cancelHandlers.clear()
}
