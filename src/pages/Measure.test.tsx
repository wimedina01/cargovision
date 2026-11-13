import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CapturedImage } from '../services/image/images'
import { releaseImage } from '../services/image/images'
import { Measure } from './Measure'

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

// The photo is shown at half size, so one screen pixel is two photo pixels.
const photo: CapturedImage = {
  blob: new Blob(['photo']),
  url: 'blob:photo',
  width: 1000,
  height: 500,
}

const handleName = /^(Reference|Measurement).* (start|end)$/

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 500,
    bottom: 250,
    width: 500,
    height: 250,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
})

async function openPhoto() {
  render(<Measure />)
  await userEvent.click(screen.getByRole('button', { name: 'Capture' }))
  return screen.getByAltText('The photo to measure')
}

function tap(stage: HTMLElement, x: number, y: number) {
  fireEvent.click(stage, { clientX: x, clientY: y })
}

function handles() {
  return screen.queryAllByRole('button', { name: handleName })
}

function position(handle: HTMLElement) {
  return { x: parseFloat(handle.style.left), y: parseFloat(handle.style.top) }
}

async function markReferenceAcrossThePhoto(stage: HTMLElement) {
  tap(stage, 0, 0)
  tap(stage, 500, 0)
  await Promise.resolve()
}

describe('Measure', () => {
  it('asks for a photo before anything can be measured', () => {
    render(<Measure />)

    expect(
      screen.getByText(/Lay a sheet of paper or a bank card/),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Capture' })).toBeVisible()
    expect(screen.queryByText('Estimated sizes')).not.toBeInTheDocument()
  })

  it('guides the person from the reference to a measurement and shows both units', async () => {
    const stage = await openPhoto()
    const instruction = screen.getByRole('status')
    expect(instruction).toHaveTextContent(
      'Tap one end of the reference object.',
    )

    tap(stage, 0, 0)
    expect(instruction).toHaveTextContent('Now tap the other end.')
    tap(stage, 500, 0)
    expect(instruction).toHaveTextContent('Reference marked.')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()

    // 1000 photo pixels span the 11 in reference, so 500 pixels are 5.5 in.
    tap(stage, 0, 100)
    tap(stage, 250, 100)
    const size = screen.getByRole('listitem')
    expect(size).toHaveTextContent('Measurement 1')
    expect(size).toHaveTextContent('5.5 in')
    expect(size).toHaveTextContent('14.0 cm')
  })

  it('does not scale from a reference that is too small to trust', async () => {
    const stage = await openPhoto()

    tap(stage, 0, 0)
    tap(stage, 5, 0)
    tap(stage, 0, 100)
    tap(stage, 250, 100)

    expect(screen.getByText(/too small in the photo/)).toBeVisible()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('warns that a short reference makes the estimate less accurate', async () => {
    const stage = await openPhoto()

    tap(stage, 0, 0)
    tap(stage, 40, 0)
    tap(stage, 0, 100)
    tap(stage, 250, 100)

    expect(screen.getByText(/takes up little of the photo/)).toBeVisible()
    expect(screen.getByRole('listitem')).toBeInTheDocument()
  })

  it('scales from a reference object of any length the person enters', async () => {
    const stage = await openPhoto()
    await markReferenceAcrossThePhoto(stage)
    tap(stage, 0, 100)
    tap(stage, 250, 100)

    await userEvent.selectOptions(
      screen.getByLabelText('Reference object'),
      'Something else',
    )
    expect(
      screen.getByText(
        'Enter the length of the reference object to see sizes.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Length'), '10')
    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'cm')

    // 1000 photo pixels are 100 mm, so 500 pixels are 50 mm.
    const size = screen.getByRole('listitem')
    expect(size).toHaveTextContent('5.0 cm')
    expect(size).toHaveTextContent('2.0 in')
  })

  it('rejects a reference length that is not a positive number', async () => {
    await openPhoto()

    await userEvent.selectOptions(
      screen.getByLabelText('Reference object'),
      'Something else',
    )
    await userEvent.type(screen.getByLabelText('Length'), 'abc')

    expect(screen.getByText('Enter a number greater than 0.')).toBeVisible()
    expect(screen.getByLabelText('Length')).toBeInvalid()
  })

  it('removes the last point with undo and every point with clear all', async () => {
    const stage = await openPhoto()
    tap(stage, 0, 0)
    tap(stage, 500, 0)
    tap(stage, 100, 100)
    expect(handles()).toHaveLength(3)

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(handles()).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(handles()).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  it('lets a keyboard user place a point and stops at the maximum', async () => {
    await openPhoto()
    const add = screen.getByRole('button', { name: 'Add point' })

    await userEvent.click(add)
    expect(position(handles()[0] as HTMLElement)).toEqual({ x: 50, y: 50 })

    for (let count = 1; count < 14; count += 1) {
      await userEvent.click(add)
    }
    expect(handles()).toHaveLength(14)
    expect(add).toBeDisabled()
    expect(screen.getByText(/most measurements/)).toBeVisible()
  })

  it('does not add a point when an existing point is tapped', async () => {
    const stage = await openPhoto()
    tap(stage, 0, 0)

    fireEvent.click(handles()[0] as HTMLElement)

    expect(handles()).toHaveLength(1)
  })

  it('nudges a point with the arrow keys and keeps it inside the photo', async () => {
    const stage = await openPhoto()
    tap(stage, 0, 0)
    const handle = handles()[0] as HTMLElement
    handle.focus()

    await userEvent.keyboard('{ArrowLeft}{ArrowUp}')
    expect(position(handle)).toEqual({ x: 0, y: 0 })

    // Steps are a 400th of the photo's longer side, rounded: 3 pixels.
    await userEvent.keyboard('{ArrowRight}')
    expect(position(handle).x).toBeCloseTo(0.3)
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(position(handle).y).toBeCloseTo(3)
  })

  it('moves a point when it is dragged', async () => {
    const stage = await openPhoto()
    tap(stage, 0, 0)
    const handle = handles()[0] as HTMLElement

    fireEvent.pointerDown(handle, { pointerId: 1 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 250, clientY: 125 })
    expect(position(handle)).toEqual({ x: 50, y: 50 })

    fireEvent.pointerUp(handle, { pointerId: 1 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 0 })
    expect(position(handle)).toEqual({ x: 50, y: 50 })
  })

  it('discards the photo and its marks when the photo is retaken', async () => {
    const stage = await openPhoto()
    tap(stage, 0, 0)

    await userEvent.click(screen.getByRole('button', { name: 'Retake photo' }))

    expect(releaseImage).toHaveBeenCalledWith(photo)
    expect(
      screen.getByText(/Lay a sheet of paper or a bank card/),
    ).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Capture' }))
    expect(handles()).toHaveLength(0)
  })
})
