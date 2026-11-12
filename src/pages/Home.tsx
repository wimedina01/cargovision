import type { IconName } from '../components/Icon'
import { Icon } from '../components/Icon'
import { LinkButton } from '../components/Button'
import { Card } from '../components/Card'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import type { PwaStatus } from '../hooks/usePwaStatus'
import styles from './Home.module.css'

const offlineDetails: Record<
  PwaStatus,
  { title: string; description: string; icon: IconName }
> = {
  development: {
    title: 'Production preview needed',
    description:
      'Offline caching is off in development. Use the production preview to test installing and offline use.',
    icon: 'info',
  },
  unsupported: {
    title: 'Secure connection needed',
    description:
      'Use Chrome over HTTPS or localhost to prepare this device for offline use. The camera needs a secure connection too.',
    icon: 'alert',
  },
  preparing: {
    title: 'Preparing offline use',
    description:
      'Keep this page open while CargoVision saves about 8 MB of reading tools. Do not disconnect until it is ready.',
    icon: 'download',
  },
  ready: {
    title: 'Ready to use offline',
    description:
      'The app, barcode reader and text reader are saved on this device. You can open CargoVision and use it without a connection.',
    icon: 'check',
  },
  error: {
    title: 'Offline setup needs attention',
    description:
      'Review the error above. Reconnect and reload to retry; offline use has not been confirmed.',
    icon: 'alert',
  },
}

export function Home({ pwaStatus }: { pwaStatus: PwaStatus }) {
  const offline = offlineDetails[pwaStatus]

  return (
    <>
      <PageHeader
        eyebrow="CARGOVISION"
        title="Check a package"
        description="Use the camera to read a shipping label or measure a package. Everything is worked out on this device."
      />

      <div className={styles.actions}>
        <Card className={styles.actionCard} aria-labelledby="read-heading">
          <span className={styles.actionIcon}>
            <Icon name="tag" width="26" height="26" />
          </span>
          <h2 id="read-heading">Read a label</h2>
          <p>
            Photograph a shipping label. CargoVision reads its barcodes and
            text, then explains what they mean.
          </p>
          <LinkButton to="/read">
            <Icon name="camera" width="21" height="21" />
            Read a label
            <Icon name="arrow" width="19" height="19" />
          </LinkButton>
        </Card>
        <Card className={styles.actionCard} aria-labelledby="measure-heading">
          <span className={styles.actionIcon}>
            <Icon name="ruler" width="26" height="26" />
          </span>
          <h2 id="measure-heading">Measure a package</h2>
          <p>
            Photograph a package next to a sheet of paper or a bank card, and
            CargoVision estimates how long it is.
          </p>
          <LinkButton to="/measure">
            <Icon name="ruler" width="21" height="21" />
            Measure
            <Icon name="arrow" width="19" height="19" />
          </LinkButton>
        </Card>
      </div>

      <Card className={styles.device} aria-labelledby="device-heading">
        <div className={styles.cardHeading}>
          <Icon name="shield" width="22" height="22" />
          <h2 id="device-heading">Stays on this device</h2>
        </div>
        <div
          className={`${styles.offlineState} ${pwaStatus === 'ready' ? styles.ready : ''}`}
        >
          <Icon name={offline.icon} width="21" height="21" />
          <div>
            <h3>{offline.title}</h3>
            <p>{offline.description}</p>
          </div>
        </div>
        {pwaStatus === 'preparing' && (
          <LoadingState label="Saving the app for offline use..." />
        )}
        <p className={styles.deviceNote}>
          No sign-in or external services. Photos are read on this device and
          are never saved or uploaded. The connection indicator reflects the
          browser&apos;s network signal, not a server check.
        </p>
      </Card>
    </>
  )
}
