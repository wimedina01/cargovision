export type CameraProblemKind =
  'denied' | 'no-camera' | 'in-use' | 'unsupported' | 'failed'

export interface CameraProblem {
  kind: CameraProblemKind
  title: string
  message: string
}

const PHOTO_FALLBACK = 'You can still choose a photo from this device.'

function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const { name } = error
    if (typeof name === 'string') return name
  }
  return ''
}

/** Turns a failure from `getUserMedia` into something a person can act on. */
export function describeCameraError(error: unknown): CameraProblem {
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return {
        kind: 'denied',
        title: 'Camera access is blocked',
        message: `Allow the camera for this site from the icon at the left of the address bar, then try again. ${PHOTO_FALLBACK}`,
      }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        kind: 'no-camera',
        title: 'No camera found',
        message: `This device has no camera the browser can use. ${PHOTO_FALLBACK}`,
      }
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return {
        kind: 'in-use',
        title: 'The camera is busy',
        message: `Another app or tab may be using it. Close that app, then try again. ${PHOTO_FALLBACK}`,
      }
    default:
      return {
        kind: 'failed',
        title: 'The camera could not start',
        message: `Try again. ${PHOTO_FALLBACK}`,
      }
  }
}

/** For a camera that was working and then stopped by itself. */
export function cameraStoppedProblem(): CameraProblem {
  return {
    kind: 'in-use',
    title: 'The camera stopped',
    message: `It may have been disconnected or taken by another app. Try again. ${PHOTO_FALLBACK}`,
  }
}

/** Null when this page can ask for the camera, otherwise why it cannot. */
export function cameraSupportProblem(): CameraProblem | null {
  const devices: MediaDevices | undefined = navigator.mediaDevices
  if (typeof devices?.getUserMedia === 'function') return null

  if (window.isSecureContext === false) {
    return {
      kind: 'unsupported',
      title: 'The camera needs a secure page',
      message: `Browsers only allow the camera on https:// pages. Open CargoVision from its https:// address. ${PHOTO_FALLBACK}`,
    }
  }
  return {
    kind: 'unsupported',
    title: 'This browser cannot use the camera',
    message: PHOTO_FALLBACK,
  }
}
