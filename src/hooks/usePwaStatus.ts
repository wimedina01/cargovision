import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export type PwaStatus =
  'development' | 'unsupported' | 'preparing' | 'ready' | 'error'

function describeError(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.'
}

export function usePwaStatus() {
  const [previouslyInstalled, setPreviouslyInstalled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const supported = window.isSecureContext && 'serviceWorker' in navigator

  const {
    offlineReady: [offlineReady],
    needRefresh: [updateAvailable],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      setPreviouslyInstalled(Boolean(registration?.active))
    },
    onRegisterError(cause: unknown) {
      console.error('CargoVision could not register its offline shell.', cause)
      setError(`Offline setup failed: ${describeError(cause)}`)
    },
  })

  let status: PwaStatus = 'preparing'
  if (import.meta.env.DEV) status = 'development'
  else if (!supported) status = 'unsupported'
  else if (error) status = 'error'
  else if (offlineReady || previouslyInstalled) status = 'ready'

  async function applyUpdate() {
    setUpdating(true)
    setError(null)
    try {
      await updateServiceWorker(true)
    } catch (cause) {
      console.error('CargoVision could not apply the downloaded update.', cause)
      setError(
        `Update failed: ${describeError(cause)} Reload the app to retry.`,
      )
    } finally {
      setUpdating(false)
    }
  }

  return { status, error, updateAvailable, updating, applyUpdate }
}
