import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { usePwaStatus } from './usePwaStatus'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: vi.fn() }))

beforeEach(() => {
  vi.stubEnv('DEV', false)
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('navigator', { serviceWorker: {} })
  vi.mocked(useRegisterSW).mockReturnValue({
    offlineReady: [false, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('waits for successful precaching before reporting offline readiness', () => {
  const { result, rerender } = renderHook(usePwaStatus)
  expect(result.current.status).toBe('preparing')

  vi.mocked(useRegisterSW).mockReturnValue({
    offlineReady: [true, vi.fn()],
    needRefresh: [false, vi.fn()],
    updateServiceWorker: vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined),
  })
  rerender()
  expect(result.current.status).toBe('ready')
})

it('reports insecure production origins as unsupported', () => {
  vi.stubGlobal('isSecureContext', false)
  const { result } = renderHook(usePwaStatus)
  expect(result.current.status).toBe('unsupported')
})

it('logs and exposes registration errors instead of reporting success', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { result } = renderHook(usePwaStatus)
  const onRegisterError =
    vi.mocked(useRegisterSW).mock.calls[0]?.[0]?.onRegisterError
  expect(onRegisterError).toBeDefined()

  act(() => onRegisterError?.(new Error('Cache write failed')))
  expect(result.current.status).toBe('error')
  expect(result.current.error).toContain('Cache write failed')
  expect(log).toHaveBeenCalled()
})

it('surfaces an update failure and releases the busy state for recovery', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(useRegisterSW).mockReturnValue({
    offlineReady: [true, vi.fn()],
    needRefresh: [true, vi.fn()],
    updateServiceWorker: vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('Worker stopped')),
  })
  const { result } = renderHook(usePwaStatus)

  await act(async () => {
    await result.current.applyUpdate()
  })
  expect(result.current.status).toBe('error')
  expect(result.current.error).toContain('Worker stopped')
  expect(result.current.updating).toBe(false)
  expect(log).toHaveBeenCalled()
})
