import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorState } from '../components/ErrorState'
import { Icon } from '../components/Icon'
import { StatusBanner } from '../components/StatusBanner'
import { appConfig } from '../config/appConfig'
import { usePwaStatus } from '../hooks/usePwaStatus'
import { useRouteAccessibility } from '../hooks/useRouteAccessibility'
import { reloadApp } from '../services/app/reloadApp'
import { ErrorBoundary } from './ErrorBoundary'
import { AppRoutes } from './router'
import styles from './App.module.css'

function AppShell() {
  const pwa = usePwaStatus()
  const [confirmUpdate, setConfirmUpdate] = useState(false)
  useRouteAccessibility()

  return (
    <div className={styles.app}>
      <AppHeader />
      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.notices}>
          {pwa.error && (
            <ErrorState
              title="Offline support needs attention"
              action={
                <Button variant="secondary" onClick={reloadApp}>
                  Reload to retry
                </Button>
              }
            >
              {pwa.error}
            </ErrorState>
          )}
          {pwa.status === 'unsupported' && (
            <StatusBanner
              tone="warning"
              title="Offline installation is unavailable"
            >
              Open this build in Chrome over HTTPS or localhost. An ordinary
              HTTP network address cannot register the offline shell.
            </StatusBanner>
          )}
          {pwa.updateAvailable && (
            <StatusBanner title="An app update is ready">
              <p>
                Reload when you are ready. CargoVision will not refresh
                automatically.
              </p>
              <Button
                variant="secondary"
                disabled={pwa.updating}
                onClick={() => setConfirmUpdate(true)}
              >
                {pwa.updating ? 'Applying update...' : 'Review update'}
              </Button>
            </StatusBanner>
          )}
        </div>
        <AppRoutes pwaStatus={pwa.status} />
      </main>
      <footer className={styles.footer}>
        <span className={styles.privacy}>
          <Icon name="shield" width="17" height="17" />
          No account. No cloud connection.
        </span>
        <div className={styles.footerMeta}>
          {appConfig.developerMode && (
            <Link to="/diagnostics">Diagnostics</Link>
          )}
          <span>
            Milestone {appConfig.milestone} / v{appConfig.version}
          </span>
        </div>
      </footer>
      <ConfirmDialog
        open={confirmUpdate}
        title="Reload CargoVision?"
        description="Apply the downloaded app update now. No inspections are stored in this foundation build."
        confirmLabel="Reload and update"
        onCancel={() => setConfirmUpdate(false)}
        onConfirm={() => {
          setConfirmUpdate(false)
          void pwa.applyUpdate()
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  )
}
