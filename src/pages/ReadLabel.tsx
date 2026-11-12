import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { CameraCapture } from '../components/CameraCapture'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'
import { useCapturedImage } from '../hooks/useCapturedImage'
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
          <ul className={styles.findings}>
            {reading.findings.map((finding) => (
              <FindingItem key={finding.id} finding={finding} />
            ))}
          </ul>
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

export function ReadLabel() {
  const [image, setImage] = useCapturedImage()
  const [reading, setReading] = useState<Reading>({ status: 'idle' })
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
      <PageHeader
        eyebrow="READ A LABEL"
        title="Read a label"
        description="Photograph a shipping label. CargoVision reads its barcodes and text on this device and explains what they mean."
      />

      {!image ? (
        <Card aria-labelledby="capture-heading">
          <h2 className={styles.heading} id="capture-heading">
            Photograph the label
          </h2>
          <CameraCapture onCapture={(captured) => void start(captured)} />
          <ul className={styles.tips}>
            <li>Fill the frame with the label and keep it flat.</li>
            <li>Use even light and avoid glare on glossy labels.</li>
            <li>Hold still while the photo is taken.</li>
          </ul>
        </Card>
      ) : (
        <div className={styles.layout}>
          <Card className={styles.photo} aria-labelledby="photo-heading">
            <h2 className={styles.heading} id="photo-heading">
              Your photo
            </h2>
            <img src={image.url} alt="The photographed label" />
            <Button variant="secondary" onClick={retake}>
              <Icon name="camera" width="20" height="20" />
              Retake photo
            </Button>
          </Card>
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
