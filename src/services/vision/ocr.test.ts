import { createWorker } from 'tesseract.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OcrCancelledError,
  OcrUnavailableError,
  cancelOcr,
  recognizeText,
  warmUpOcr,
} from './ocr'

vi.mock('tesseract.js', () => ({ createWorker: vi.fn() }))

const createWorkerMock = vi.mocked(createWorker)
type WorkerLike = Awaited<ReturnType<typeof createWorker>>

function makeWorker() {
  return {
    recognize: vi.fn(() =>
      Promise.resolve({ data: { text: 'PIECES 2', confidence: 91 } }),
    ),
    terminate: vi.fn(() => Promise.resolve()),
  }
}

function asWorker(worker: ReturnType<typeof makeWorker>): WorkerLike {
  return worker as unknown as WorkerLike
}

const photo = new Blob(['photo'])

describe('ocr', () => {
  beforeEach(() => {
    createWorkerMock.mockReset()
  })

  afterEach(() => {
    cancelOcr()
  })

  it('reads text with the reader files bundled in the app', async () => {
    const worker = makeWorker()
    createWorkerMock.mockResolvedValue(asWorker(worker))

    await expect(recognizeText(photo)).resolves.toEqual({
      text: 'PIECES 2',
      confidence: 91,
    })

    expect(createWorkerMock).toHaveBeenCalledWith(
      'eng',
      undefined,
      expect.objectContaining({
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/tesseract-core-simd-lstm.wasm.js',
        langPath: '/ocr',
        cacheMethod: 'none',
        workerBlobURL: false,
      }),
    )
  })

  it('starts one reader and reuses it for later reads', async () => {
    const worker = makeWorker()
    createWorkerMock.mockResolvedValue(asWorker(worker))

    await warmUpOcr()
    await recognizeText(photo)
    await recognizeText(photo)

    expect(createWorkerMock).toHaveBeenCalledTimes(1)
    expect(worker.recognize).toHaveBeenCalledTimes(2)
  })

  it('reports reading progress and ignores other status messages', async () => {
    const worker = makeWorker()
    createWorkerMock.mockResolvedValue(asWorker(worker))
    const options = () => createWorkerMock.mock.calls[0]?.[2]
    worker.recognize.mockImplementation(() => {
      options()?.logger?.({
        status: 'loading language traineddata',
        progress: 1,
      } as never)
      options()?.logger?.({
        status: 'recognizing text',
        progress: 0.5,
      } as never)
      return Promise.resolve({ data: { text: 'X', confidence: 80 } })
    })
    const onProgress = vi.fn()

    await recognizeText(photo, onProgress)

    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(onProgress).toHaveBeenCalledWith(0.5)
  })

  it('can start again after the reader failed to load', async () => {
    createWorkerMock.mockRejectedValueOnce('worker script missing')
    createWorkerMock.mockResolvedValueOnce(asWorker(makeWorker()))

    await expect(recognizeText(photo)).rejects.toThrow('worker script missing')
    await expect(recognizeText(photo)).resolves.toMatchObject({
      confidence: 91,
    })
    expect(createWorkerMock).toHaveBeenCalledTimes(2)
  })

  it('fails instead of hanging when the language data cannot load', async () => {
    createWorkerMock.mockReturnValue(new Promise(() => undefined))

    const read = recognizeText(photo)
    await vi.waitFor(() => {
      expect(createWorkerMock).toHaveBeenCalledTimes(1)
    })
    createWorkerMock.mock.calls[0]?.[2]?.errorHandler?.('traineddata missing')

    await expect(read).rejects.toThrow('traineddata missing')
  })

  it('stops a read in progress and starts a fresh reader next time', async () => {
    const stuck = makeWorker()
    stuck.recognize.mockReturnValue(new Promise(() => undefined))
    createWorkerMock.mockResolvedValueOnce(asWorker(stuck))

    const read = recognizeText(photo)
    await vi.waitFor(() => {
      expect(stuck.recognize).toHaveBeenCalled()
    })
    cancelOcr()

    await expect(read).rejects.toBeInstanceOf(OcrCancelledError)
    await vi.waitFor(() => {
      expect(stuck.terminate).toHaveBeenCalled()
    })

    createWorkerMock.mockResolvedValueOnce(asWorker(makeWorker()))
    await expect(recognizeText(photo)).resolves.toMatchObject({
      confidence: 91,
    })
    expect(createWorkerMock).toHaveBeenCalledTimes(2)
  })

  it('discards a reader that finished loading after being cancelled', async () => {
    const late = makeWorker()
    let release: (worker: WorkerLike) => void = () => undefined
    createWorkerMock.mockReturnValue(
      new Promise<WorkerLike>((resolve) => {
        release = resolve
      }),
    )

    const read = recognizeText(photo)
    await vi.waitFor(() => {
      expect(createWorkerMock).toHaveBeenCalled()
    })
    cancelOcr()
    await expect(read).rejects.toBeInstanceOf(OcrCancelledError)

    release(asWorker(late))
    await vi.waitFor(() => {
      expect(late.terminate).toHaveBeenCalled()
    })
    expect(late.recognize).not.toHaveBeenCalled()
  })

  it('reports a browser without WebAssembly SIMD support', async () => {
    vi.spyOn(WebAssembly, 'validate').mockReturnValue(false)

    await expect(recognizeText(photo)).rejects.toBeInstanceOf(
      OcrUnavailableError,
    )
    expect(createWorkerMock).not.toHaveBeenCalled()
  })
})
