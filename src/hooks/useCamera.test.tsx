import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCamera } from './useCamera'

function fakeCamera(deviceId: string) {
  let onEnded: (() => void) | undefined
  const track = {
    stop: vi.fn(),
    getSettings: () => ({ deviceId }),
    addEventListener: (_type: string, listener: () => void) => {
      onEnded = listener
    },
  }
  const stream = {
    id: `stream-${deviceId}`,
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream

  return {
    stream,
    track,
    end: () => {
      onEnded?.()
    },
  }
}

function stubMediaDevices(cameraIds: string[] = []) {
  const getUserMedia = vi.fn<MediaDevices['getUserMedia']>()
  const enumerateDevices = vi
    .fn<MediaDevices['enumerateDevices']>()
    .mockResolvedValue(
      cameraIds.map(
        (deviceId) => ({ kind: 'videoinput', deviceId }) as MediaDeviceInfo,
      ),
    )
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  })
  return { getUserMedia }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'mediaDevices')
})

describe('useCamera', () => {
  it('reports a browser that cannot use the camera', () => {
    const { result } = renderHook(() => useCamera())

    expect(result.current.state).toMatchObject({
      status: 'error',
      problem: { kind: 'unsupported' },
    })
  })

  it('prefers the rear camera and goes live', async () => {
    const { getUserMedia } = stubMediaDevices(['back'])
    const camera = fakeCamera('back')
    getUserMedia.mockResolvedValue(camera.stream)

    const { result } = renderHook(() => useCamera())
    expect(result.current.state.status).toBe('starting')

    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'live',
        stream: camera.stream,
      })
    })
    expect(getUserMedia.mock.lastCall?.[0]).toMatchObject({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    })
    expect(result.current.canSwitch).toBe(false)
  })

  it('turns the camera off when it is no longer needed', async () => {
    const { getUserMedia } = stubMediaDevices()
    const camera = fakeCamera('back')
    getUserMedia.mockResolvedValue(camera.stream)

    const { result, unmount } = renderHook(() => useCamera())
    await waitFor(() => {
      expect(result.current.state.status).toBe('live')
    })
    expect(camera.track.stop).not.toHaveBeenCalled()

    unmount()
    expect(camera.track.stop).toHaveBeenCalledOnce()
  })

  it('turns off a camera that opens after the screen was left', async () => {
    const { getUserMedia } = stubMediaDevices()
    const camera = fakeCamera('back')
    let open: (stream: MediaStream) => void = () => undefined
    getUserMedia.mockReturnValue(
      new Promise<MediaStream>((resolve) => {
        open = resolve
      }),
    )

    const { unmount } = renderHook(() => useCamera())
    unmount()
    await act(async () => {
      open(camera.stream)
      await Promise.resolve()
    })

    expect(camera.track.stop).toHaveBeenCalledOnce()
  })

  it('explains a failure and tries again on request', async () => {
    const { getUserMedia } = stubMediaDevices()
    const camera = fakeCamera('back')
    getUserMedia
      .mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
      .mockResolvedValueOnce(camera.stream)

    const { result } = renderHook(() => useCamera())
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'error',
        problem: { kind: 'denied' },
      })
    })

    act(() => {
      result.current.retry()
    })
    expect(result.current.state.status).toBe('starting')
    await waitFor(() => {
      expect(result.current.state.status).toBe('live')
    })
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('switches between the cameras on the device', async () => {
    const { getUserMedia } = stubMediaDevices(['back', 'front'])
    const back = fakeCamera('back')
    const front = fakeCamera('front')
    getUserMedia
      .mockResolvedValueOnce(back.stream)
      .mockResolvedValueOnce(front.stream)
      .mockResolvedValueOnce(back.stream)

    const { result } = renderHook(() => useCamera())
    await waitFor(() => {
      expect(result.current.canSwitch).toBe(true)
    })

    act(() => {
      result.current.switchCamera()
    })
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'live',
        stream: front.stream,
      })
    })
    expect(getUserMedia.mock.lastCall?.[0]).toMatchObject({
      audio: false,
      video: { deviceId: { exact: 'front' } },
    })
    expect(back.track.stop).toHaveBeenCalledOnce()

    act(() => {
      result.current.switchCamera()
    })
    await waitFor(() => {
      expect(result.current.state).toMatchObject({
        status: 'live',
        stream: back.stream,
      })
    })
    expect(getUserMedia.mock.lastCall?.[0]).toMatchObject({
      audio: false,
      video: { deviceId: { exact: 'back' } },
    })
  })

  it('reports a camera that stops by itself', async () => {
    const { getUserMedia } = stubMediaDevices()
    const camera = fakeCamera('back')
    getUserMedia.mockResolvedValue(camera.stream)

    const { result } = renderHook(() => useCamera())
    await waitFor(() => {
      expect(result.current.state.status).toBe('live')
    })

    act(() => {
      camera.end()
    })
    expect(result.current.state).toMatchObject({
      status: 'error',
      problem: { title: 'The camera stopped' },
    })
  })
})
