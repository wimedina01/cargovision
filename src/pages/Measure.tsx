import { useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import { Button } from '../components/Button'
import { CameraCapture } from '../components/CameraCapture'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'
import { useCapturedImage } from '../hooks/useCapturedImage'
import {
  DEFAULT_PRESET_ID,
  MAX_MEASUREMENTS,
  REFERENCE_PRESETS,
  clientToImagePoint,
  formatLength,
  isReferenceShort,
  lengthInUnit,
  millimetresPerPixel,
  movePoint,
  pairUp,
  parseLength,
} from '../services/measure/geometry'
import type { Point } from '../services/measure/geometry'
import type { LengthUnit } from '../services/units'
import styles from './Measure.module.css'

const CUSTOM = 'custom'

/** The reference takes two points and each measurement takes two more. */
const MAX_POINTS = 2 + MAX_MEASUREMENTS * 2

interface ReferenceLength {
  length: number
  unit: LengthUnit
}

function resolveReference(
  presetId: string,
  customLength: string,
  customUnit: LengthUnit,
): ReferenceLength | null {
  if (presetId === CUSTOM) {
    const length = parseLength(customLength)
    return length === null ? null : { length, unit: customUnit }
  }
  const preset = REFERENCE_PRESETS.find(
    (candidate) => candidate.id === presetId,
  )
  return preset ? { length: preset.length, unit: preset.unit } : null
}

function instructionFor(pointCount: number): string {
  if (pointCount === 0) return 'Tap one end of the reference object.'
  if (pointCount >= MAX_POINTS) {
    return 'That is the most measurements for one photo. Undo a point or clear all to continue.'
  }
  if (pointCount === 2) {
    return 'Reference marked. Tap one end of what you want to measure.'
  }
  if (pointCount % 2 === 1) return 'Now tap the other end.'
  return 'Tap one end of the next thing to measure, or drag any point to adjust it.'
}

function pointLabel(index: number): string {
  const end = index % 2 === 0 ? 'start' : 'end'
  if (index < 2) return `Reference ${end}`
  return `Measurement ${Math.floor((index - 2) / 2) + 1} ${end}`
}

function percent(value: number, whole: number): string {
  return `${(value / whole) * 100}%`
}

export function Measure() {
  const [image, setImage] = useCapturedImage()
  const [points, setPoints] = useState<Point[]>([])
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID)
  const [customLength, setCustomLength] = useState('')
  const [customUnit, setCustomUnit] = useState<LengthUnit>('in')
  const stage = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)

  function pointAt(client: Point): Point | null {
    const rect = stage.current?.getBoundingClientRect()
    return image && rect ? clientToImagePoint(client, rect, image) : null
  }

  function addPoint(point: Point | null) {
    if (!point) return
    setPoints((current) =>
      current.length < MAX_POINTS ? [...current, point] : current,
    )
  }

  function movePointTo(index: number, point: Point) {
    setPoints((current) => current.map((p, i) => (i === index ? point : p)))
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    activePointer.current = event.pointerId
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Without capture the drag still works while the pointer stays on the point.
    }
  }

  function drag(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (activePointer.current !== event.pointerId) return
    const point = pointAt({ x: event.clientX, y: event.clientY })
    if (point) movePointTo(index, point)
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (activePointer.current === event.pointerId) activePointer.current = null
  }

  function nudge(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!image) return
    const step =
      Math.max(1, Math.round(Math.max(image.width, image.height) / 400)) *
      (event.shiftKey ? 5 : 1)
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const offset = offsets[event.key]
    if (!offset) return

    event.preventDefault()
    setPoints((current) =>
      current.map((p, i) =>
        i === index ? movePoint(p, offset[0], offset[1], image) : p,
      ),
    )
  }

  function retake() {
    setImage(null)
    setPoints([])
  }

  const segments = pairUp(points)
  const reference = segments[0] ?? null
  const measurements = segments.slice(1)
  const known = resolveReference(presetId, customLength, customUnit)
  const mmPerPixel =
    reference && known
      ? millimetresPerPixel(reference, known.length, known.unit)
      : null

  let scaleProblem: string | null = null
  if (image && reference) {
    if (!known) {
      scaleProblem = 'Enter the length of the reference object to see sizes.'
    } else if (mmPerPixel === null) {
      scaleProblem =
        'The reference is too small in the photo to measure from. Undo it and mark its two ends farther apart.'
    } else if (isReferenceShort(reference, image)) {
      scaleProblem =
        'The reference takes up little of the photo, so sizes will be less accurate. Retake the photo closer, or use a larger reference.'
    }
  }
  const customInvalid = presetId === CUSTOM && customLength !== '' && !known

  return (
    <>
      <PageHeader
        eyebrow="MEASURE"
        title="Measure a package"
        description="Photograph a package next to an object of known size, such as a sheet of paper. Mark both and CargoVision estimates the package's length."
      />

      {!image ? (
        <Card aria-labelledby="capture-heading">
          <h2 className={styles.heading} id="capture-heading">
            Photograph the package
          </h2>
          <CameraCapture
            onCapture={(captured) => {
              setImage(captured)
              setPoints([])
            }}
          />
          <ol className={styles.tips}>
            <li>
              Lay a sheet of paper or a bank card flat, right beside the edge
              you want to measure.
            </li>
            <li>Hold the camera straight above, not at an angle.</li>
            <li>Keep both in view, as large in the photo as you can.</li>
          </ol>
        </Card>
      ) : (
        <div className={styles.layout}>
          <Card aria-labelledby="photo-heading">
            <h2 className={styles.heading} id="photo-heading">
              Mark the reference, then the package
            </h2>
            <p className={styles.instruction} role="status">
              {instructionFor(points.length)}
            </p>
            <div
              ref={stage}
              className={styles.stage}
              style={{
                aspectRatio: `${image.width} / ${image.height}`,
                width: `min(100%, calc(66dvh * ${image.width / image.height}))`,
              }}
              onClick={(event: MouseEvent<HTMLDivElement>) => {
                addPoint(pointAt({ x: event.clientX, y: event.clientY }))
              }}
            >
              <img
                className={styles.photo}
                src={image.url}
                alt="The photo to measure"
                draggable={false}
              />
              <svg className={styles.lines} aria-hidden="true">
                {segments.map((segment, index) => {
                  const middleX = percent(
                    (segment.a.x + segment.b.x) / 2,
                    image.width,
                  )
                  const middleY = percent(
                    (segment.a.y + segment.b.y) / 2,
                    image.height,
                  )
                  const line = {
                    x1: percent(segment.a.x, image.width),
                    y1: percent(segment.a.y, image.height),
                    x2: percent(segment.b.x, image.width),
                    y2: percent(segment.b.y, image.height),
                  }
                  let label: string | null = null
                  if (index === 0) {
                    label = known ? `${known.length} ${known.unit}` : null
                  } else if (mmPerPixel !== null) {
                    label = `${formatLength(lengthInUnit(segment, mmPerPixel, 'in'))} in`
                  }

                  return (
                    <g
                      key={index}
                      className={
                        index === 0 ? styles.referenceLine : styles.measureLine
                      }
                    >
                      <line className={styles.lineBacking} {...line} />
                      <line className={styles.line} {...line} />
                      {label && (
                        <text x={middleX} y={middleY} dy="-0.7em">
                          {label}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
              {points.map((point, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.handle} ${
                    index < 2 ? styles.referenceHandle : styles.measureHandle
                  }`}
                  style={{
                    left: percent(point.x, image.width),
                    top: percent(point.y, image.height),
                  }}
                  aria-label={pointLabel(index)}
                  aria-describedby="handle-hint"
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                  onPointerDown={startDrag}
                  onPointerMove={(event) => {
                    drag(event, index)
                  }}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={(event) => {
                    nudge(event, index)
                  }}
                />
              ))}
            </div>
            <p className={styles.hint} id="handle-hint">
              Drag a point to adjust it. With a keyboard, focus a point and use
              the arrow keys, or hold Shift for larger steps.
            </p>
            <div className={styles.actions}>
              <Button
                variant="secondary"
                disabled={points.length >= MAX_POINTS}
                onClick={() => {
                  addPoint({ x: image.width / 2, y: image.height / 2 })
                }}
              >
                <Icon name="crosshair" width="20" height="20" />
                Add point
              </Button>
              <Button
                variant="secondary"
                disabled={points.length === 0}
                onClick={() => {
                  setPoints((current) => current.slice(0, -1))
                }}
              >
                <Icon name="undo" width="20" height="20" />
                Undo
              </Button>
              <Button
                variant="secondary"
                disabled={points.length === 0}
                onClick={() => {
                  setPoints([])
                }}
              >
                <Icon name="trash" width="20" height="20" />
                Clear all
              </Button>
              <Button variant="secondary" onClick={retake}>
                <Icon name="camera" width="20" height="20" />
                Retake photo
              </Button>
            </div>
          </Card>

          <div className={styles.side}>
            <Card aria-labelledby="reference-heading">
              <h2 className={styles.heading} id="reference-heading">
                Reference object
              </h2>
              <p className={styles.help}>
                Choose what you laid beside the package, and which of its sides
                you marked.
              </p>
              <label className={styles.field}>
                <span>Known length</span>
                <select
                  value={presetId}
                  onChange={(event) => {
                    setPresetId(event.target.value)
                  }}
                >
                  {REFERENCE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                  <option value={CUSTOM}>Something else</option>
                </select>
              </label>
              {presetId === CUSTOM && (
                <div className={styles.custom}>
                  <label className={styles.field}>
                    <span>Length</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={customLength}
                      aria-invalid={customInvalid}
                      aria-describedby={
                        customInvalid ? 'custom-length-error' : undefined
                      }
                      onChange={(event) => {
                        setCustomLength(event.target.value)
                      }}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Unit</span>
                    <select
                      value={customUnit}
                      onChange={(event) => {
                        setCustomUnit(event.target.value as LengthUnit)
                      }}
                    >
                      <option value="in">inches</option>
                      <option value="cm">centimeters</option>
                      <option value="mm">millimeters</option>
                    </select>
                  </label>
                  {customInvalid && (
                    <p className={styles.error} id="custom-length-error">
                      Enter a number greater than 0.
                    </p>
                  )}
                </div>
              )}
            </Card>

            <Card aria-labelledby="sizes-heading">
              <h2 className={styles.heading} id="sizes-heading">
                Estimated sizes
              </h2>
              {scaleProblem && (
                <StatusBanner tone="warning" title="Check the reference">
                  {scaleProblem}
                </StatusBanner>
              )}
              {mmPerPixel !== null && measurements.length > 0 ? (
                <ol className={styles.sizes}>
                  {measurements.map((segment, index) => (
                    <li key={index}>
                      <span>Measurement {index + 1}</span>
                      <strong>
                        {formatLength(lengthInUnit(segment, mmPerPixel, 'in'))}{' '}
                        in
                      </strong>
                      <span>
                        {formatLength(lengthInUnit(segment, mmPerPixel, 'cm'))}{' '}
                        cm
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.help}>
                  Sizes appear here once the reference is marked and you have
                  marked both ends of something to measure.
                </p>
              )}
              <p className={styles.caveat}>
                These are estimates. They are most accurate when the reference
                lies in the same flat surface as the edge you measure and the
                camera looks straight down at it. Use a tape measure for any
                official dimensions.
              </p>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
