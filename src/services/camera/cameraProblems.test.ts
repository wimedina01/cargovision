import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cameraStoppedProblem,
  cameraSupportProblem,
  describeCameraError,
} from './cameraProblems'

describe('describeCameraError', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['PermissionDeniedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'no-camera'],
    ['NotReadableError', 'in-use'],
    ['AbortError', 'in-use'],
    ['OverconstrainedError', 'failed'],
  ])('maps %s to %s', (name, kind) => {
    expect(describeCameraError(new DOMException('x', name)).kind).toBe(kind)
  })

  it('copes with values that are not errors', () => {
    expect(describeCameraError('boom').kind).toBe('failed')
    expect(describeCameraError(undefined).kind).toBe('failed')
    expect(describeCameraError({ name: 42 }).kind).toBe('failed')
  })

  it('always points to choosing a photo instead', () => {
    for (const problem of [
      describeCameraError(new DOMException('x', 'NotAllowedError')),
      describeCameraError(new DOMException('x', 'NotFoundError')),
      describeCameraError(new DOMException('x', 'NotReadableError')),
      describeCameraError(new Error('x')),
      cameraStoppedProblem(),
    ]) {
      expect(problem.message).toContain('choose a photo')
    }
  })
})

describe('cameraSupportProblem', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'mediaDevices')
    vi.unstubAllGlobals()
  })

  it('reports a browser without camera access', () => {
    expect(cameraSupportProblem()?.kind).toBe('unsupported')
  })

  it('explains that an insecure page cannot use the camera', () => {
    vi.stubGlobal('isSecureContext', false)
    expect(cameraSupportProblem()?.title).toBe('The camera needs a secure page')
  })

  it('reports nothing when the camera can be requested', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    })
    expect(cameraSupportProblem()).toBeNull()
  })
})
