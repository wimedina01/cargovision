import { useEffect, useState } from 'react'
import {
  cameraStoppedProblem,
  cameraSupportProblem,
  describeCameraError,
} from '../services/camera/cameraProblems'
import type { CameraProblem } from '../services/camera/cameraProblems'

export type CameraState =
  | { status: 'starting' }
  | { status: 'live'; stream: MediaStream }
  | { status: 'error'; problem: CameraProblem }

export interface UseCamera {
  state: CameraState
  /** True when the device has more than one camera to choose from. */
  canSwitch: boolean
  /** Starts again with the default camera, after a failure. */
  retry: () => void
  switchCamera: () => void
}

interface Request {
  /** Changes to restart the camera even when the same device is wanted. */
  id: number
  deviceId: string | undefined
}

function constraints(deviceId: string | undefined): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      ...(deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' } }),
      width: { ideal: 2560 },
      height: { ideal: 1440 },
    },
  }
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

function initialState(): CameraState {
  const problem = cameraSupportProblem()
  return problem ? { status: 'error', problem } : { status: 'starting' }
}

/**
 * Opens the camera while the component is on screen, preferring the rear
 * camera, and turns it off again when the component goes away.
 */
export function useCamera(): UseCamera {
  const [state, setState] = useState<CameraState>(initialState)
  const [request, setRequest] = useState<Request>({
    id: 0,
    deviceId: undefined,
  })
  const [cameras, setCameras] = useState<string[]>([])

  useEffect(() => {
    const devices: MediaDevices | undefined = navigator.mediaDevices
    if (typeof devices?.getUserMedia !== 'function') return undefined

    let cancelled = false
    let stream: MediaStream | undefined

    void devices.getUserMedia(constraints(request.deviceId)).then(
      (opened) => {
        if (cancelled) {
          stopStream(opened)
          return
        }
        stream = opened
        for (const track of opened.getVideoTracks()) {
          track.addEventListener('ended', () => {
            if (!cancelled) {
              setState({ status: 'error', problem: cameraStoppedProblem() })
            }
          })
        }
        setState({ status: 'live', stream: opened })

        // Device ids are only revealed once the camera has been allowed.
        void devices.enumerateDevices().then(
          (found) => {
            if (cancelled) return
            setCameras(
              found
                .filter((d) => d.kind === 'videoinput' && d.deviceId !== '')
                .map((d) => d.deviceId),
            )
          },
          () => undefined,
        )
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', problem: describeCameraError(error) })
        }
      },
    )

    return () => {
      cancelled = true
      if (stream) stopStream(stream)
    }
  }, [request])

  function restart(deviceId: string | undefined) {
    setState({ status: 'starting' })
    setRequest((current) => ({ id: current.id + 1, deviceId }))
  }

  function switchCamera() {
    if (cameras.length < 2) return

    const current =
      state.status === 'live'
        ? state.stream.getVideoTracks()[0]?.getSettings().deviceId
        : undefined
    const index = current ? cameras.indexOf(current) : -1
    const next = cameras[(index + 1) % cameras.length]
    if (next) restart(next)
  }

  return {
    state,
    canSwitch: cameras.length > 1,
    retry: () => {
      restart(undefined)
    },
    switchCamera,
  }
}
