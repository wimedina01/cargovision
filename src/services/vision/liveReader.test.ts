import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { frameFromVideo } from '../image/images'
import { startLiveReader } from './liveReader'
import { OcrCancelledError } from './ocr'
import { readLabel } from './readLabel'
import type { LabelReading } from './readLabel'

vi.mock('../image/images', () => ({ frameFromVideo: vi.fn() }))
vi.mock('./readLabel', () => ({ readLabel: vi.fn() }))

const frame = new Blob(['frame'])

function labelReading(overrides: Partial<LabelReading> = {}): LabelReading {
  return {
    barcodes: [],
    text: '',
    confidence: null,
    findings: [],
    barcodeProblem: null,
    textProblem: null,
    ...overrides,
  }
}

type PreviewState = Partial<{
  readyState: number
  videoWidth: number
  paused: boolean
  ended: boolean
}>

function preview(state: PreviewState = {}): HTMLVideoElement {
  const video = document.createElement('video')
  const values = {
    readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
    videoWidth: 640,
    paused: false,
    ended: false,
    ...state,
  }
  for (const [name, value] of Object.entries(values)) {
    Object.defineProperty(video, name, { value, configurable: true })
  }
  return video
}

function begin(video = preview()) {
  const onReading = vi.fn()
  const onUnavailable = vi.fn()
  const stop = startLiveReader(video, { onReading, onUnavailable })
  return { onReading, onUnavailable, stop }
}

/** Lets the reader finish whatever it can do without the clock moving on. */
function settle() {
  return vi.advanceTimersByTimeAsync(0)
}

describe('startLiveReader', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    vi.mocked(frameFromVideo).mockResolvedValue(frame)
    vi.mocked(readLabel).mockResolvedValue(labelReading())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads each frame as it is, without turning it level, and reports the reading', async () => {
    const video = preview()
    const reading = labelReading({ text: '2 PCS' })
    vi.mocked(readLabel).mockResolvedValue(reading)

    const { onReading, stop } = begin(video)
    await settle()

    expect(frameFromVideo).toHaveBeenCalledWith(video)
    expect(readLabel).toHaveBeenCalledWith(frame, { level: false })
    expect(onReading).toHaveBeenCalledExactlyOnceWith(reading)
    stop()
  })

  it('rests briefly between reads', async () => {
    const { stop } = begin()
    await settle()
    expect(readLabel).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(299)
    expect(readLabel).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(readLabel).toHaveBeenCalledTimes(2)
    stop()
  })

  it('reads one frame at a time and rests longer after a slow read', async () => {
    let finish: (reading: LabelReading) => void = () => undefined
    vi.mocked(readLabel).mockReturnValueOnce(
      new Promise<LabelReading>((resolve) => {
        finish = resolve
      }),
    )
    const { onReading, stop } = begin()

    await vi.advanceTimersByTimeAsync(4000)
    expect(readLabel).toHaveBeenCalledTimes(1)
    finish(labelReading())
    await settle()
    expect(onReading).toHaveBeenCalledOnce()

    // A quarter of the 4 seconds the read took.
    await vi.advanceTimersByTimeAsync(999)
    expect(readLabel).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(readLabel).toHaveBeenCalledTimes(2)
    stop()
  })

  it('waits while the page is hidden and carries on once it is visible', async () => {
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden')
    const { stop } = begin()

    await vi.advanceTimersByTimeAsync(3000)
    expect(frameFromVideo).not.toHaveBeenCalled()

    visibility.mockReturnValue('visible')
    await vi.advanceTimersByTimeAsync(500)
    expect(readLabel).toHaveBeenCalledOnce()
    stop()
  })

  it.each([
    ['paused', { paused: true }],
    ['finished', { ended: true }],
    ['without a frame yet', { readyState: HTMLMediaElement.HAVE_METADATA }],
    ['without a size yet', { videoWidth: 0 }],
  ])('does not read a preview that is %s', async (_name, state) => {
    const { stop } = begin(preview(state))

    await vi.advanceTimersByTimeAsync(3000)

    expect(frameFromVideo).not.toHaveBeenCalled()
    stop()
  })

  it('stops reading when asked, even while resting', async () => {
    const { onReading, stop } = begin()
    await settle()
    expect(onReading).toHaveBeenCalledOnce()

    stop()
    await vi.advanceTimersByTimeAsync(5000)

    expect(readLabel).toHaveBeenCalledOnce()
    expect(onReading).toHaveBeenCalledOnce()
  })

  it('ignores a read that finishes after it was stopped', async () => {
    let finish: (reading: LabelReading) => void = () => undefined
    vi.mocked(readLabel).mockReturnValueOnce(
      new Promise<LabelReading>((resolve) => {
        finish = resolve
      }),
    )
    const { onReading, onUnavailable, stop } = begin()
    await settle()

    stop()
    finish(labelReading({ text: 'late' }))
    await vi.advanceTimersByTimeAsync(5000)

    expect(onReading).not.toHaveBeenCalled()
    expect(onUnavailable).not.toHaveBeenCalled()
    expect(readLabel).toHaveBeenCalledOnce()
  })

  it.each([
    [
      'a frame cannot be taken',
      () => vi.mocked(frameFromVideo).mockRejectedValue(new Error('no frame')),
    ],
    [
      'reading throws',
      () => vi.mocked(readLabel).mockRejectedValue(new Error('boom')),
    ],
    [
      'neither reader works',
      () =>
        vi
          .mocked(readLabel)
          .mockResolvedValue(
            labelReading({ barcodeProblem: 'a', textProblem: 'b' }),
          ),
    ],
  ])('gives up after three failures in a row when %s', async (_name, fail) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    fail()
    const { onReading, onUnavailable } = begin()

    await settle()
    await vi.advanceTimersByTimeAsync(300)
    expect(onUnavailable).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(onUnavailable).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(5000)
    expect(frameFromVideo).toHaveBeenCalledTimes(3)
    expect(onReading).not.toHaveBeenCalled()
  })

  it('counts only failures that follow one another', async () => {
    vi.mocked(readLabel)
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(labelReading())
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
    const { onUnavailable, stop } = begin()

    await settle()
    await vi.advanceTimersByTimeAsync(300 * 5)

    expect(readLabel).toHaveBeenCalledTimes(6)
    expect(onUnavailable).not.toHaveBeenCalled()
    stop()
  })

  it('keeps going with one reader when the other is not working', async () => {
    const reading = labelReading({ textProblem: 'The text reader stopped.' })
    vi.mocked(readLabel).mockResolvedValue(reading)
    const { onReading, onUnavailable, stop } = begin()

    await settle()
    await vi.advanceTimersByTimeAsync(300 * 5)

    expect(onReading).toHaveBeenCalledTimes(6)
    expect(onReading).toHaveBeenLastCalledWith(reading)
    expect(onUnavailable).not.toHaveBeenCalled()
    stop()
  })

  it('does not count a stopped text reader as a failure', async () => {
    vi.mocked(readLabel).mockRejectedValue(new OcrCancelledError())
    const { onUnavailable, stop } = begin()

    await settle()
    await vi.advanceTimersByTimeAsync(300 * 5)

    expect(readLabel).toHaveBeenCalledTimes(6)
    expect(onUnavailable).not.toHaveBeenCalled()
    stop()
  })
})
