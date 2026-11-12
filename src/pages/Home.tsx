import { Button, LinkButton } from '../components/Button'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
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
      'Offline caching is off in development. Use the production preview to install and test the app shell.',
    icon: 'info',
  },
  unsupported: {
    title: 'Secure connection needed',
    description:
      'Use Chrome over HTTPS or localhost to prepare this device for offline use.',
    icon: 'alert',
  },
  preparing: {
    title: 'Preparing offline access',
    description:
      'Keep this page open while the app shell downloads. Do not disconnect until it is ready.',
    icon: 'download',
  },
  ready: {
    title: 'Offline shell ready',
    description:
      'The app shell is cached on this device. You can reopen and navigate it without a connection.',
    icon: 'check',
  },
  error: {
    title: 'Offline setup needs attention',
    description:
      'Review the error above. Reconnect and reload to retry; offline access has not been confirmed.',
    icon: 'alert',
  },
}

function CargoIllustration() {
  return (
    <div className={styles.illustration} aria-hidden="true">
      <span className={styles.illustrationTag}>A NEW PERSPECTIVE ON CARGO</span>
      <svg viewBox="0 0 400 300" className={styles.parcel}>
        <ellipse cx="213" cy="256" rx="132" ry="25" className={styles.shadow} />
        <path d="m210 45 119 66-119 67-119-67Z" className={styles.boxTop} />
        <path d="m91 111 119 67v105L91 217Z" className={styles.boxLeft} />
        <path d="m210 178 119-67v106l-119 66Z" className={styles.boxRight} />
        <path d="m161 72 38-21 119 67-38 21Z" className={styles.tape} />
        <path d="m280 139 38-21v47l-38 22Z" className={styles.tape} />
        <path
          d="m118 170 15-8 15 25m-15-25v44m29-20 15-8 15 25m-15-25v44"
          className={styles.boxMark}
        />
        <path d="m67 255 45 25m198-6 32-18" className={styles.groundLine} />
      </svg>
      <span className={styles.illustrationCaption}>WORKSPACE FOUNDATION</span>
    </div>
  )
}

export function Home({ pwaStatus }: { pwaStatus: PwaStatus }) {
  const offline = offlineDetails[pwaStatus]

  return (
    <>
      <div className={styles.intro}>
        <PageHeader
          eyebrow="YOUR ACCEPTANCE WORKSPACE"
          title="A clearer view of your cargo."
          description="One place for the work ahead. Thoughtfully built for your tablet, with a local-first approach."
        />
        <span className={styles.proofBadge}>
          <Icon name="info" width="16" height="16" />
          Early local proof of concept
        </span>
      </div>

      <Card className={styles.hero} aria-labelledby="inspection-heading">
        <div className={styles.heroContent}>
          <span className={styles.sectionLabel}>
            CARGO ACCEPTANCE, REIMAGINED
          </span>
          <h2 id="inspection-heading">
            Every piece.
            <br />A better perspective.
          </h2>
          <p>
            A foundation for capturing labels, measuring boxes, and reviewing
            shipment details. Today, explore the app shell. Capture tools come
            next.
          </p>
          <div className={styles.heroAction}>
            <LinkButton
              to="/inspection/new"
              aria-describedby="inspection-availability"
            >
              <Icon name="plus" width="21" height="21" />
              Start New Inspection
              <Icon name="arrow" width="19" height="19" />
            </LinkButton>
            <span id="inspection-availability">
              Opens a preview. Inspections begin in Milestone 2.
            </span>
          </div>
        </div>
        <CargoIllustration />
      </Card>

      <div className={styles.actions}>
        <Card className={styles.actionCard} aria-labelledby="history-heading">
          <span className={styles.actionIcon}>
            <Icon name="history" />
          </span>
          <h2 id="history-heading">Inspection history</h2>
          <p>Your future place for saved drafts and completed inspections.</p>
          <LinkButton to="/history" variant="secondary">
            Inspection History <Icon name="arrow" width="18" height="18" />
          </LinkButton>
        </Card>
        <Card className={styles.actionCard} aria-labelledby="camera-heading">
          <span className={`${styles.actionIcon} ${styles.mutedIcon}`}>
            <Icon name="camera" />
          </span>
          <h2 id="camera-heading">Camera test</h2>
          <p>Rear-camera preview and capture checks will be available next.</p>
          <Button
            variant="secondary"
            disabled
            aria-describedby="camera-availability"
          >
            <Icon name="camera" width="20" height="20" /> Camera Test
          </Button>
          <span className={styles.availability} id="camera-availability">
            Coming in Milestone 2
          </span>
        </Card>
        <Card className={styles.actionCard} aria-labelledby="settings-heading">
          <span className={styles.actionIcon}>
            <Icon name="settings" />
          </span>
          <h2 id="settings-heading">Make yourself at home</h2>
          <p>
            View app defaults and learn how to install on your ChromeOS tablet.
          </p>
          <LinkButton to="/settings" variant="secondary">
            Settings <Icon name="arrow" width="18" height="18" />
          </LinkButton>
        </Card>
      </div>

      <div className={styles.details}>
        <Card className={styles.deviceCard} aria-labelledby="device-heading">
          <div className={styles.cardHeading}>
            <Icon name="shield" width="22" height="22" />
            <h2 id="device-heading">Built to stay with you</h2>
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
            <LoadingState label="Caching the app shell..." />
          )}
          <p className={styles.deviceNote}>
            No sign-in or external services. No inspection data is captured or
            saved in this milestone. The connection indicator reflects the
            browser&apos;s network signal, not a server check.
          </p>
        </Card>
        <Card className={styles.roadmapCard} aria-labelledby="roadmap-heading">
          <div className={styles.cardHeading}>
            <Icon name="box" width="22" height="22" />
            <h2 id="roadmap-heading">Built one step at a time</h2>
          </div>
          <ol className={styles.roadmap}>
            <li>
              <span className={styles.currentStep}>
                <Icon name="check" width="22" height="22" />
              </span>
              <div>
                <strong>Application foundation</strong>
                <span>Navigation and offline app shell</span>
              </div>
              <span className={styles.currentLabel}>CURRENT</span>
            </li>
            <li>
              <span className={styles.stepNumber}>02</span>
              <div>
                <strong>Camera + local storage</strong>
                <span>Planned next, not available yet</span>
              </div>
            </li>
            <li>
              <span className={styles.stepNumber}>03</span>
              <div>
                <strong>Labels, barcodes + OCR</strong>
                <span>Future milestone, not available yet</span>
              </div>
            </li>
          </ol>
        </Card>
      </div>
    </>
  )
}
