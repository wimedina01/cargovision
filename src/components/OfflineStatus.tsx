import type { PwaStatus } from '../hooks/usePwaStatus'
import { Icon } from './Icon'
import styles from './OfflineStatus.module.css'

const messages: Partial<Record<PwaStatus, string>> = {
  preparing: 'Preparing offline use...',
  ready: 'Ready to use offline',
}

/** A quiet line about offline readiness. Problems are shown as banners instead. */
export function OfflineStatus({ status }: { status: PwaStatus }) {
  const message = messages[status]

  return (
    <p className={styles.status} role="status">
      {message && (
        <>
          <Icon
            name={status === 'ready' ? 'check' : 'download'}
            width="17"
            height="17"
          />
          {message}
        </>
      )}
    </p>
  )
}
