import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CapturedImage } from '../services/image/images'
import { releaseImage } from '../services/image/images'
import type * as Ocr from '../services/vision/ocr'
import { OcrCancelledError, cancelOcr, warmUpOcr } from '../services/vision/ocr'
import { readLabel } from '../services/vision/readLabel'
import type { LabelReading } from '../services/vision/readLabel'
import { ReadLabel } from './ReadLabel'

vi.mock('../components/CameraCapture', () => ({
  CameraCapture: ({
    onCapture,
  }: {
    onCapture: (image: CapturedImage) => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onCapture(photo)
      }}
    >
      Capture
    </button>
  ),
}))
vi.mock('../services/image/images', () => ({ releaseImage: vi.fn() }))
vi.mock('../services/vision/ocr', async (importOriginal) => ({
  ...(await importOriginal<typeof Ocr>()),
  warmUpOcr: vi.fn(),
  cancelOcr: vi.fn(),
}))
vi.mock('../services/vision/readLabel', () => ({ readLabel: vi.fn() }))

const photo: CapturedImage = {
  blob: new Blob(['photo']),
  url: 'blob:photo',
  width: 1200,
  height: 800,
}

const reading: LabelReading = {
  barcodes: [{ format: 'Code 128', text: '01612345675' }],
  text: '2 PCS\n10 KG',
  confidence: 90,
  findings: [
    {
      id: 'awb-1',
      category: 'awb',
      title: 'Air waybill 016-1234 5675',
      detail: 'The check digit is correct.',
      tone: 'ok',
      sources: ['barcode'],
      raw: '01612345675',
    },
    {
      id: 'handling-1',
      category: 'handling',
      title: 'Fragile',
      detail: 'Handle with care.',
      tone: 'caution',
      sources: ['text'],
      raw: 'FRAGILE',
    },
  ],
  barcodeProblem: null,
  textProblem: null,
}

function renderPage() {
  vi.mocked(warmUpOcr).mockResolvedValue(undefined)
  return render(<ReadLabel />)
}

async function capture() {
  await userEvent.click(screen.getByRole('button', { name: 'Capture' }))
}

function pending() {
  let finish: (value: LabelReading) => void = () => undefined
  const promise = new Promise<LabelReading>((resolve) => {
    finish = resolve
  })
  return { promise, finish: (value: LabelReading) => finish(value) }
}

describe('ReadLabel', () => {
  it('starts the text reader early and stops its work when left', () => {
    const { unmount } = renderPage()

    expect(
      screen.getByRole('heading', { name: 'Photograph the label' }),
    ).toBeVisible()
    expect(warmUpOcr).toHaveBeenCalledOnce()
    expect(cancelOcr).not.toHaveBeenCalled()

    unmount()
    expect(cancelOcr).toHaveBeenCalledOnce()
  })

  it('explains what the label says in plain language', async () => {
    vi.mocked(readLabel).mockResolvedValue(reading)
    renderPage()

    await capture()

    expect(readLabel).toHaveBeenCalledOnce()
    const [blob, options] = vi.mocked(readLabel).mock.calls[0] ?? []
    expect(blob).toBe(photo.blob)
    expect(options?.signal).toBeInstanceOf(AbortSignal)
    const heading = await screen.findByRole('heading', {
      name: 'What the label says',
    })
    expect(heading).toHaveFocus()
    expect(screen.getByAltText('The photographed label')).toHaveAttribute(
      'src',
      'blob:photo',
    )
    expect(
      screen.getByRole('heading', { name: 'Air waybill 016-1234 5675' }),
    ).toBeVisible()
    expect(screen.getByText('The check digit is correct.')).toBeVisible()
    expect(screen.getByText('From barcode')).toBeVisible()
    expect(screen.getByText('FRAGILE')).toBeVisible()
    expect(screen.getByText(/dangerous goods markings are not/)).toBeVisible()
  })

  it('shows exactly what was read so it can be compared with the label', async () => {
    vi.mocked(readLabel).mockResolvedValue(reading)
    renderPage()
    await capture()
    await screen.findByRole('heading', { name: 'What the label says' })

    await userEvent.click(screen.getByText('Exactly what was read'))

    expect(screen.getByText('Code 128')).toBeVisible()
    expect(screen.getByText(/2 PCS/)).toHaveTextContent('2 PCS 10 KG')
    expect(screen.getByText('Text confidence: 90%')).toBeVisible()
  })

  it('shows progress while the photo is being read', async () => {
    const run = pending()
    vi.mocked(readLabel).mockImplementation((_blob, options) => {
      options?.onProgress?.({ stage: 'text', fraction: 0.4 })
      return run.promise
    })
    renderPage()

    await capture()

    expect(screen.getByText('Reading the text...')).toBeVisible()
    expect(
      screen.getByRole('progressbar', { name: 'Text reading progress' }),
    ).toHaveAttribute('value', '40')

    await act(async () => {
      run.finish(reading)
      await Promise.resolve()
    })
    expect(
      screen.getByRole('heading', { name: 'What the label says' }),
    ).toBeVisible()
    expect(screen.queryByText('Reading the text...')).not.toBeInTheDocument()
  })

  it('warns about a partial or doubtful reading and a label with nothing recognized', async () => {
    vi.mocked(readLabel).mockResolvedValue({
      ...reading,
      barcodes: [],
      text: 'x',
      confidence: 40,
      findings: [],
      barcodeProblem: 'The barcode reader could not start.',
    })
    renderPage()

    await capture()

    expect(await screen.findByText('Barcodes were not read')).toBeVisible()
    expect(
      screen.getByText('The barcode reader could not start.'),
    ).toBeVisible()
    expect(screen.getByText('The text was hard to read')).toBeVisible()
    expect(
      screen.getByText(/No air waybill number, quantity or handling term/),
    ).toBeVisible()
  })

  it('says so when the photo cannot be read at all', async () => {
    vi.mocked(readLabel).mockRejectedValue(new Error('boom'))
    renderPage()

    await capture()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The label could not be read',
    )
    expect(
      screen.queryByRole('heading', { name: 'What the label says' }),
    ).not.toBeInTheDocument()
  })

  it('stops reading and starts over when the photo is retaken', async () => {
    vi.mocked(readLabel).mockReturnValue(
      new Promise<LabelReading>(() => undefined),
    )
    renderPage()
    await capture()
    const signal = vi.mocked(readLabel).mock.calls[0]?.[1]?.signal
    expect(signal?.aborted).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Retake photo' }))

    expect(signal?.aborted).toBe(true)
    expect(releaseImage).toHaveBeenCalledWith(photo)
    expect(
      screen.getByRole('heading', { name: 'Photograph the label' }),
    ).toBeVisible()
  })

  it('ignores a result that arrives after the photo was retaken', async () => {
    const run = pending()
    vi.mocked(readLabel).mockReturnValue(run.promise)
    renderPage()
    await capture()
    await userEvent.click(screen.getByRole('button', { name: 'Retake photo' }))

    await act(async () => {
      run.finish(reading)
      await Promise.resolve()
    })

    expect(
      screen.queryByRole('heading', { name: 'What the label says' }),
    ).not.toBeInTheDocument()
  })

  it('treats a cancelled reading as nothing to report', async () => {
    vi.mocked(readLabel).mockRejectedValue(new OcrCancelledError())
    renderPage()

    await capture()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
