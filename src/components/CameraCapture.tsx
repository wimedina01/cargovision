import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useCamera } from '../hooks/useCamera'
import {
  ImageError,
  imageFromFile,
  imageFromVideo,
  releaseImage,
} from '../services/image/images'
import type { CapturedImage } from '../services/image/images'
import { Button } from './Button'
import { Icon } from './Icon'
import { LoadingState } from './LoadingState'
import { StatusBanner } from './StatusBanner'
import styles from './CameraCapture.module.css'

interface CameraCaptureProps {
  /** Receives the photo. The receiver owns it and must release it when finished. */
  onCapture: (image: CapturedImage) => void
  /** Receives the preview once it is playing, and null when it stops or goes away. */
  onVideoChange?: (video: HTMLVideoElement | null) => void
}

/**
 * A live camera preview with a button to take a photo, plus a way to choose
 * an existing photo when the camera is unavailable or not wanted.
 */
export function CameraCapture({
  onCapture,
  onVideoChange,
}: CameraCaptureProps) {
  const { state, canSwitch, retry, switchCamera } = useCamera()
  const [busy, setBusy] = useState(false)
  const [photoProblem, setPhotoProblem] = useState<string | null>(null)
  const [readyStream, setReadyStream] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mounted = useRef(false)

  const stream = state.status === 'live' ? state.stream : null
  // Frames cannot be taken until the preview has started playing.
  const ready = stream !== null && readyStream === stream.id

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return undefined
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    if (!ready || !onVideoChange) return undefined
    onVideoChange(videoRef.current)
    return () => {
      onVideoChange(null)
    }
  }, [ready, onVideoChange])

  async function prepare(make: () => Promise<CapturedImage>) {
    setBusy(true)
    setPhotoProblem(null)
    try {
      const image = await make()
      if (mounted.current) {
        onCapture(image)
      } else {
        releaseImage(image)
      }
    } catch (error) {
      if (mounted.current) {
        setPhotoProblem(
          error instanceof ImageError
            ? error.message
            : 'The photo could not be prepared. Try again.',
        )
      }
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  async function takePhoto() {
    const video = videoRef.current
    if (video) await prepare(() => imageFromVideo(video))
  }

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    // Clear the field so choosing the same photo again still counts.
    input.value = ''
    if (file) await prepare(() => imageFromFile(file))
  }

  return (
    <div className={styles.capture}>
      {state.status === 'error' ? (
        <StatusBanner tone="warning" title={state.problem.title}>
          <p>{state.problem.message}</p>
          {state.problem.kind !== 'unsupported' && (
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          )}
        </StatusBanner>
      ) : (
        <div className={styles.viewfinder}>
          {stream ? (
            <video
              ref={videoRef}
              className={styles.video}
              aria-label="Live camera preview"
              autoPlay
              muted
              playsInline
              onLoadedMetadata={() => {
                setReadyStream(stream.id)
              }}
            />
          ) : (
            <LoadingState label="Starting the camera. Allow access if asked." />
          )}
        </div>
      )}

      <div className={styles.actions}>
        {stream && (
          <Button
            disabled={!ready || busy}
            onClick={() => void takePhoto()}
            aria-busy={busy}
          >
            <Icon name="camera" width="21" height="21" />
            {busy ? 'Preparing photo...' : 'Take photo'}
          </Button>
        )}
        {stream && canSwitch && (
          <Button variant="secondary" disabled={busy} onClick={switchCamera}>
            <Icon name="swap" width="20" height="20" />
            Switch camera
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="image" width="20" height="20" />
          Choose a photo
        </Button>
      </div>

      {photoProblem && (
        <StatusBanner tone="error" title="That photo could not be used">
          {photoProblem}
        </StatusBanner>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="Photo file"
        hidden
        onChange={(event) => void choosePhoto(event)}
      />
    </div>
  )
}
