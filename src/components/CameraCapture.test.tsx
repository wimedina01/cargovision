import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type * as Images from '../services/image/images'
import {
  ImageError,
  imageFromFile,
  imageFromVideo,
  releaseImage,
} from '../services/image/images'
import type { CapturedImage } from '../services/image/images'
import { useCamera } from '../hooks/useCamera'
import type { UseCamera } from '../hooks/useCamera'
import { CameraCapture } from './CameraCapture'

vi.mock('../hooks/useCamera', () => ({ useCamera: vi.fn() }))
vi.mock('../services/image/images', async (importOriginal) => ({
  ...(await importOriginal<typeof Images>()),
  imageFromFile: vi.fn(),
  imageFromVideo: vi.fn(),
  releaseImage: vi.fn(),
}))

const stream = { id: 'stream-1' } as unknown as MediaStream
const photo: CapturedImage = {
  blob: new Blob(['photo']),
  url: 'blob:photo',
  width: 1200,
  height: 800,
}

function camera(overrides: Partial<UseCamera> = {}): UseCamera {
  return {
    state: { status: 'live', stream },
    canSwitch: false,
    retry: vi.fn(),
    switchCamera: vi.fn(),
    ...overrides,
  }
}

function showCamera(overrides: Partial<UseCamera> = {}) {
  const hook = camera(overrides)
  vi.mocked(useCamera).mockReturnValue(hook)
  const onCapture = vi.fn()
  const onVideoChange = vi.fn()
  const view = render(
    <CameraCapture onCapture={onCapture} onVideoChange={onVideoChange} />,
  )
  return { hook, onCapture, onVideoChange, ...view }
}

function startPreview() {
  fireEvent.loadedMetadata(screen.getByLabelText('Live camera preview'))
}

describe('CameraCapture', () => {
  it('hands over the preview once it is playing and takes it back when it goes away', () => {
    const { onVideoChange, unmount } = showCamera()
    expect(onVideoChange).not.toHaveBeenCalled()

    startPreview()
    expect(onVideoChange).toHaveBeenCalledExactlyOnceWith(
      screen.getByLabelText('Live camera preview'),
    )

    unmount()
    expect(onVideoChange).toHaveBeenLastCalledWith(null)
  })

  it('lets go of the preview while the camera is switching', () => {
    const { onCapture, onVideoChange, rerender } = showCamera()
    startPreview()
    onVideoChange.mockClear()

    vi.mocked(useCamera).mockReturnValue(
      camera({
        state: {
          status: 'live',
          stream: { id: 'stream-2' } as unknown as MediaStream,
        },
      }),
    )
    rerender(
      <CameraCapture onCapture={onCapture} onVideoChange={onVideoChange} />,
    )
    expect(onVideoChange).toHaveBeenCalledExactlyOnceWith(null)

    startPreview()
    expect(onVideoChange).toHaveBeenLastCalledWith(
      screen.getByLabelText('Live camera preview'),
    )
  })

  it('waits for the preview before a photo can be taken', async () => {
    vi.mocked(imageFromVideo).mockResolvedValue(photo)
    const { onCapture } = showCamera()
    const take = screen.getByRole('button', { name: 'Take photo' })
    expect(take).toBeDisabled()

    startPreview()
    expect(take).toBeEnabled()
    await userEvent.click(take)

    expect(imageFromVideo).toHaveBeenCalledWith(
      screen.getByLabelText('Live camera preview'),
    )
    expect(onCapture).toHaveBeenCalledWith(photo)
  })

  it('shows that the camera is starting', () => {
    showCamera({ state: { status: 'starting' } })

    expect(
      screen.getByText('Starting the camera. Allow access if asked.'),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Take photo' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeEnabled()
  })

  it('explains a blocked camera and offers to try again', async () => {
    const { hook } = showCamera({
      state: {
        status: 'error',
        problem: {
          kind: 'denied',
          title: 'Camera access is blocked',
          message: 'Allow the camera for this site.',
        },
      },
    })

    expect(screen.getByText('Camera access is blocked')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(hook.retry).toHaveBeenCalledOnce()
  })

  it('does not offer to retry where the camera cannot work', () => {
    showCamera({
      state: {
        status: 'error',
        problem: {
          kind: 'unsupported',
          title: 'This browser cannot use the camera',
          message: 'You can still choose a photo from this device.',
        },
      },
    })

    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument()
  })

  it('offers to switch cameras only when there is another one', async () => {
    const { unmount } = showCamera()
    expect(
      screen.queryByRole('button', { name: 'Switch camera' }),
    ).not.toBeInTheDocument()
    unmount()

    const { hook } = showCamera({ canSwitch: true })
    await userEvent.click(screen.getByRole('button', { name: 'Switch camera' }))
    expect(hook.switchCamera).toHaveBeenCalledOnce()
  })

  it('uses a chosen photo when the camera is unavailable', async () => {
    vi.mocked(imageFromFile).mockResolvedValue(photo)
    const { onCapture } = showCamera({ state: { status: 'starting' } })
    const file = new File(['x'], 'label.jpg', { type: 'image/jpeg' })

    await userEvent.upload(screen.getByLabelText('Photo file'), file)

    expect(imageFromFile).toHaveBeenCalledWith(file)
    expect(onCapture).toHaveBeenCalledWith(photo)
  })

  it('says when a chosen file is not a usable photo', async () => {
    vi.mocked(imageFromFile).mockRejectedValue(
      new ImageError('That file could not be opened as a photo.'),
    )
    const { onCapture } = showCamera({ state: { status: 'starting' } })

    await userEvent.upload(
      screen.getByLabelText('Photo file'),
      new File(['x'], 'broken.jpg', { type: 'image/jpeg' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That file could not be opened as a photo.',
    )
    expect(onCapture).not.toHaveBeenCalled()
  })

  it('releases a photo that finishes after the screen was left', async () => {
    let finish: (image: CapturedImage) => void = () => undefined
    vi.mocked(imageFromFile).mockReturnValue(
      new Promise<CapturedImage>((resolve) => {
        finish = resolve
      }),
    )
    const { onCapture, unmount } = showCamera({
      state: { status: 'starting' },
    })

    await userEvent.upload(
      screen.getByLabelText('Photo file'),
      new File(['x'], 'label.jpg', { type: 'image/jpeg' }),
    )
    unmount()
    await act(async () => {
      finish(photo)
      await Promise.resolve()
    })

    expect(onCapture).not.toHaveBeenCalled()
    expect(releaseImage).toHaveBeenCalledWith(photo)
  })
})
