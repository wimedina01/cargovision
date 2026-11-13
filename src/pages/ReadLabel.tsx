import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '../components/Button'
import { CameraCapture } from '../components/CameraCapture'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { LoadingState } from '../components/LoadingState'
import { PageTitle } from '../components/PageTitle'
import { StatusBanner } from '../components/StatusBanner'
import { useCapturedImage } from '../hooks/useCapturedImage'
import { useLiveReading } from '../hooks/useLiveReading'
import type { CapturedImage } from '../services/image/images'
import { categoryLabels } from '../services/labels/types'
import type { Finding, FindingTone } from '../services/labels/types'
import { OcrCancelledError, cancelOcr, warmUpOcr } from '../services/vision/ocr'
import { readLabel } from '../services/vision/readLabel'
import type { LabelReading, ReadProgress } from '../services/vision/readLabel'
import styles from './ReadLabel.module.css'

/** Below this mean confidence the text is likely to contain misread characters. */
const LOW_CONFIDENCE = 60

type Reading =
  | { status: 'idle' }
  | { status: 'reading'; progress: ReadProgress }
  | { status: 'done'; reading: LabelReading }
  | { status: 'failed' }

const toneIcons: Record<FindingTone, IconName> = {
  ok: 'check',
  info: 'info',
  caution: 'alert',
}

function FindingItem({ finding }: { finding: Finding }) {
  return (
    <li className={`${styles.finding} ${styles[finding.tone]}`}>
      <span className={styles.category}>
        <Icon name={toneIcons[finding.tone]} width="16" height="16" />
        {categoryLabels[finding.category]}
      </span>
      <h3>{finding.title}</h3>
      <p>{finding.detail}</p>
      <p className={styles.evidence}>
        {finding.sources.map((source) => (
          <span className={styles.source} key={source}>
            {source === 'barcode' ? 'From barcode' : 'From text'}
          </span>
        ))}
        <code>{finding.raw}</code>
      </p>
    </li>
  )
}

function FindingList({ findings }: { findings: Finding[] }) {
  return (
    <ul className={styles.findings}>
      {findings.map((finding) => (
        <FindingItem key={finding.id} finding={finding} />
      ))}
    </ul>
  )
}

function RawReading({ reading }: { reading: LabelReading }) {
  const text = reading.text.trim()

  return (
    <details className={styles.raw}>
      <summary>Exactly what was read</summary>
      <h3>Barcodes</h3>
      {reading.barcodes.length > 0 ? (
        <ul>
          {reading.barcodes.map((barcode) => (
            <li key={`${barcode.format}\n${barcode.text}`}>
              <span>{barcode.format}</span> <code>{barcode.text}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p>No barcodes were found.</p>
      )}
      <h3>Text</h3>
      {text !== '' ? <pre>{text}</pre> : <p>No text was found.</p>}
      {reading.confidence !== null && (
        <p>Text confidence: {Math.round(reading.confidence)}%</p>
      )}
    </details>
  )
}

function Results({ reading }: { reading: LabelReading }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const lowConfidence =
    reading.confidence !== null && reading.confidence < LOW_CONFIDENCE

  return (
    <div className={styles.results}>
      {reading.barcodeProblem && (
        <StatusBanner tone="warning" title="Barcodes were not read">
          {reading.barcodeProblem}
        </StatusBanner>
      )}
      {reading.textProblem && (
        <StatusBanner tone="warning" title="Text was not read">
          {reading.textProblem}
        </StatusBanner>
      )}
      {lowConfidence && (
        <StatusBanner tone="warning" title="The text was hard to read">
          Check every detail against the label. For a better result, retake the
          photo closer, with the label flat, in even light and without glare.
        </StatusBanner>
      )}
      <Card aria-labelledby="findings-heading">
        <h2 id="findings-heading" ref={headingRef} tabIndex={-1}>
          What the label says
        </h2>
        {reading.findings.length > 0 ? (
          <FindingList findings={reading.findings} />
        ) : (
          <p className={styles.nothing}>
            No air waybill number, quantity or handling term was recognized. Try
            a closer, flatter photo, or look at exactly what was read below.
          </p>
        )}
        <RawReading reading={reading} />
        <p className={styles.disclaimer}>
          For reference only. Automatic reading can be wrong, so check every
          detail against the label and the shipper&apos;s documents. A missing
          dangerous goods notice does not mean a shipment has none, and
          dangerous goods markings are not interpreted here.
        </p>
      </Card>
    </div>
  )
}

function ReadingProgress({ progress }: { progress: ReadProgress }) {
  return (
    <Card>
      <LoadingState
        label={
          progress.stage === 'barcodes'
            ? 'Looking for barcodes...'
            : 'Reading the text...'
        }
      />
      {progress.stage === 'text' && progress.fraction !== null && (
        <progress
          className={styles.progress}
          max={100}
          value={Math.round(progress.fraction * 100)}
          aria-label="Text reading progress"
        />
      )}
      <p className={styles.note}>
        This happens on this device. The first read can take a little longer.
      </p>
    </Card>
  )
}

function LiveFindings({ reading }: { reading: LabelReading }) {
  return (
    <>
      {reading.textProblem !== null && (
        <p className={styles.liveNote}>
          Text reading is not working, so only barcodes are shown.
        </p>
      )}
      {reading.barcodeProblem !== null && (
        <p className={styles.liveNote}>
          Barcode reading is not working, so only text is shown.
        </p>
      )}
      {reading.findings.length > 0 ? (
        <FindingList findings={reading.findings} />
      ) : (
        <p className={styles.nothing}>
          Nothing recognized yet. Fill the frame with the label, keep it flat
          and hold steady.
        </p>
      )}
      <p className={styles.liveNote}>
        A quick look that can be wrong. Take a photo for the most accurate
        reading, and check every detail against the label.
      </p>
    </>
  )
}

interface LivePanelProps {
  /** The camera preview, or null while there is none. */
  video: HTMLVideoElement | null
  paused: boolean
  onPausedChange: (paused: boolean) => void
}

/** What the camera sees right now, kept beside it so the preview stays put. */
function LivePanel({ video, paused, onPausedChange }: LivePanelProps) {
  const { reading, unavailable } = useLiveReading(video, paused)

  let body: ReactNode
  if (!video) {
    body = (
      <p className={styles.liveNote}>
        Live reading starts when the camera is on.
      </p>
    )
  } else if (unavailable) {
    body = (
      <p className={styles.liveNote}>
        Live reading is not working on this device. Take a photo instead.
      </p>
    )
  } else if (paused) {
    body = (
      <p className={styles.liveNote}>
        Paused. Choose Resume to read what the camera sees.
      </p>
    )
  } else if (!reading) {
    body = <LoadingState label="Looking for a label..." />
  } else {
    body = <LiveFindings reading={reading} />
  }

  return (
    <Card className={styles.livePanel} aria-labelledby="live-heading">
      <div className={styles.liveHeader}>
        <h2 id="live-heading">Live reading</h2>
        {video && !unavailable && (
          <Button
            variant="secondary"
            onClick={() => {
              onPausedChange(!paused)
            }}
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>
        )}
      </div>
      {body}
    </Card>
  )
}

export function ReadLabel() {
  const [image, setImage] = useCapturedImage()
  const [reading, setReading] = useState<Reading>({ status: 'idle' })
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [livePaused, setLivePaused] = useState(false)
  const run = useRef<AbortController | null>(null)

  useEffect(() => {
    // Start the text reader while the label is being lined up.
    warmUpOcr().catch(() => undefined)
    return () => {
      run.current?.abort()
      cancelOcr()
    }
  }, [])

  async function start(captured: CapturedImage) {
    run.current?.abort()
    const controller = new AbortController()
    run.current = controller

    setImage(captured)
    setReading({ status: 'reading', progress: { stage: 'barcodes' } })

    try {
      const result = await readLabel(captured.blob, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            setReading({ status: 'reading', progress })
          }
        },
      })
      if (!controller.signal.aborted) {
        setReading({ status: 'done', reading: result })
      }
    } catch (error) {
      if (controller.signal.aborted || error instanceof OcrCancelledError) {
        return
      }
      setReading({ status: 'failed' })
    }
  }

  function retake() {
    run.current?.abort()
    run.current = null
    setImage(null)
    setReading({ status: 'idle' })
  }

  return (
    <>
      <PageTitle>Read a label</PageTitle>

      {!image ? (
        <div className={styles.liveLayout}>
          <div className={styles.camera}>
            <p className={styles.hint}>
              Fill the frame with the label. Keep it flat and out of glare.
            </p>
            <CameraCapture
              onCapture={(captured) => void start(captured)}
              onVideoChange={setVideo}
            />
          </div>
          <LivePanel
            video={video}
            paused={livePaused}
            onPausedChange={setLivePaused}
          />
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.photo}>
            <img src={image.url} alt="The photographed label" />
            <Button variant="secondary" onClick={retake}>
              <Icon name="camera" width="20" height="20" />
              Retake photo
            </Button>
          </div>
          <div>
            {reading.status === 'reading' && (
              <ReadingProgress progress={reading.progress} />
            )}
            {reading.status === 'done' && <Results reading={reading.reading} />}
            {reading.status === 'failed' && (
              <StatusBanner tone="error" title="The label could not be read">
                Something went wrong while reading this photo. Retake the photo
                and try again.
              </StatusBanner>
            )}
          </div>
        </div>
      )}
    </>
  )
}
