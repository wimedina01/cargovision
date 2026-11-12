import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'
import { appConfig } from '../config/appConfig'
import styles from './Settings.module.css'

export function Settings() {
  return (
    <>
      <PageHeader
        eyebrow="APP CONFIGURATION"
        title="Settings"
        description="Read-only defaults for this foundation build, plus a guide to making it feel at home."
      />
      <div className={styles.grid}>
        <Card aria-labelledby="defaults-heading">
          <h2 className={styles.heading} id="defaults-heading">
            <Icon name="settings" /> App defaults
          </h2>
          <dl className={styles.settings}>
            <div>
              <dt>Application</dt>
              <dd>{appConfig.name}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{appConfig.version}</dd>
            </div>
            <div>
              <dt>Current milestone</dt>
              <dd>{appConfig.milestone} - Foundation</dd>
            </div>
            <div>
              <dt>Default display unit</dt>
              <dd>Inches ({appConfig.defaultUnit})</dd>
            </div>
            <div>
              <dt>Developer mode</dt>
              <dd>{appConfig.developerMode ? 'On' : 'Off'}</dd>
            </div>
            <div>
              <dt>Inspection storage</dt>
              <dd>Not available</dd>
            </div>
          </dl>
          <StatusBanner title="Preferences are not editable yet">
            Saved settings arrive with local storage in Milestone 2. Units are a
            planned display default, not a measurement feature in this build.
          </StatusBanner>
        </Card>
        <Card aria-labelledby="install-heading">
          <h2 className={styles.heading} id="install-heading">
            <Icon name="download" /> Install on ChromeOS
          </h2>
          <p className={styles.lead}>
            Open it like an app. Keep the foundation available when the
            connection is not.
          </p>
          <ol className={styles.steps}>
            <li>
              <strong>Open the production build in Chrome</strong>
              <span>
                Use a trusted HTTPS address. A first visit needs a connection to
                the app host.
              </span>
            </li>
            <li>
              <strong>Wait for &quot;Offline shell ready&quot;</strong>
              <span>
                Check the workspace before disconnecting. Development mode does
                not cache the app.
              </span>
            </li>
            <li>
              <strong>Install from Chrome</strong>
              <span>
                Use the install icon in the address bar or Chrome&apos;s
                install-app menu, if your organization permits installation.
              </span>
            </li>
            <li>
              <strong>Try it without Wi-Fi</strong>
              <span>
                Launch CargoVision, turn off Wi-Fi, then reopen and navigate the
                installed app.
              </span>
            </li>
          </ol>
          <p className={styles.note}>
            Clearing browser data or removing the app can remove its offline
            cache. Camera permissions are not needed for Milestone 1.
          </p>
        </Card>
      </div>
    </>
  )
}
