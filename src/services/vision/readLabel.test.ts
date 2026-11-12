import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Ocr from './ocr'
import {
  OcrCancelledError,
  OcrUnavailableError,
  cancelOcr,
  recognizeText,
} from './ocr'
import { levelText } from '../image/deskew'
import { readBarcodes } from './barcodes'
import { readLabel } from './readLabel'
import type { ReadProgress } from './readLabel'

vi.mock('../image/deskew', () => ({ levelText: vi.fn() }))
vi.mock('./barcodes', () => ({ readBarcodes: vi.fn() }))
vi.mock('./ocr', async (importOriginal) => ({
  ...(await importOriginal<typeof Ocr>()),
  recognizeText: vi.fn(),
  cancelOcr: vi.fn(),
}))

const levelTextMock = vi.mocked(levelText)
const readBarcodesMock = vi.mocked(readBarcodes)
const recognizeTextMock = vi.mocked(recognizeText)
const photo = new Blob(['photo'])

describe('readLabel', () => {
  beforeEach(() => {
    levelTextMock.mockReset()
    readBarcodesMock.mockReset()
    recognizeTextMock.mockReset()
    levelTextMock.mockImplementation((image) => Promise.resolve(image))
    readBarcodesMock.mockResolvedValue([
      { format: 'Code 128', text: '01612345675' },
    ])
    recognizeTextMock.mockResolvedValue({
      text: '2 PCS\n10 KG',
      confidence: 90,
    })
  })

  it('explains what the barcodes and the printed text say', async () => {
    const reading = await readLabel(photo)

    expect(reading.barcodes).toEqual([
      { format: 'Code 128', text: '01612345675' },
    ])
    expect(reading.text).toBe('2 PCS\n10 KG')
    expect(reading.confidence).toBe(90)
    expect(reading.findings.map((finding) => finding.category)).toEqual([
      'awb',
      'pieces',
      'weight',
    ])
    expect(reading.barcodeProblem).toBeNull()
    expect(reading.textProblem).toBeNull()
  })

  it('reads text from the levelled photo and barcodes from the original', async () => {
    const levelled = new Blob(['levelled'])
    levelTextMock.mockResolvedValue(levelled)

    await readLabel(photo)

    expect(levelTextMock).toHaveBeenCalledWith(photo)
    expect(readBarcodesMock).toHaveBeenCalledWith(photo)
    expect(recognizeTextMock.mock.calls[0]?.[0]).toBe(levelled)
  })

  it('reports each stage and the text reading progress', async () => {
    recognizeTextMock.mockImplementation((_image, onProgress) => {
      onProgress?.(0.5)
      return Promise.resolve({ text: '', confidence: 0 })
    })
    const progress: ReadProgress[] = []

    await readLabel(photo, { onProgress: (step) => progress.push(step) })

    expect(progress).toEqual([
      { stage: 'barcodes' },
      { stage: 'text', fraction: null },
      { stage: 'text', fraction: 0.5 },
    ])
  })

  it('still interprets the text when barcodes cannot be read', async () => {
    readBarcodesMock.mockRejectedValue(new Error('wasm failed'))

    const reading = await readLabel(photo)

    expect(reading.barcodes).toEqual([])
    expect(reading.barcodeProblem).toMatch(/barcodes could not be read/i)
    expect(reading.findings.map((finding) => finding.category)).toEqual([
      'pieces',
      'weight',
    ])
  })

  it('still interprets the barcodes when text cannot be read', async () => {
    recognizeTextMock.mockRejectedValue(new Error('worker failed'))

    const reading = await readLabel(photo)

    expect(reading.text).toBe('')
    expect(reading.confidence).toBeNull()
    expect(reading.textProblem).toMatch(/text could not be read/i)
    expect(reading.findings.map((finding) => finding.category)).toEqual(['awb'])
  })

  it('says so when the browser cannot read printed text at all', async () => {
    recognizeTextMock.mockRejectedValue(new OcrUnavailableError('no SIMD'))

    const reading = await readLabel(photo)

    expect(reading.textProblem).toMatch(/cannot read printed text/i)
  })

  it('does not swallow a cancelled text reading', async () => {
    recognizeTextMock.mockRejectedValue(new OcrCancelledError('stopped'))

    await expect(readLabel(photo)).rejects.toBeInstanceOf(OcrCancelledError)
  })

  it('does not start reading text once the signal has aborted', async () => {
    const controller = new AbortController()
    readBarcodesMock.mockImplementation(() => {
      controller.abort()
      return Promise.resolve([])
    })

    await expect(
      readLabel(photo, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(OcrCancelledError)
    expect(recognizeTextMock).not.toHaveBeenCalled()
    expect(cancelOcr).toHaveBeenCalled()
  })

  it('does not start reading text when the signal aborts while levelling', async () => {
    const controller = new AbortController()
    levelTextMock.mockImplementation((image) => {
      controller.abort()
      return Promise.resolve(image)
    })

    await expect(
      readLabel(photo, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(OcrCancelledError)
    expect(recognizeTextMock).not.toHaveBeenCalled()
  })

  it('refuses to start with a signal that has already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      readLabel(photo, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(OcrCancelledError)
    expect(readBarcodesMock).not.toHaveBeenCalled()
  })
})
