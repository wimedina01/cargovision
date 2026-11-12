import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { appConfig } from '../config/appConfig'
import styles from './About.module.css'

export function About() {
  return (
    <>
      <PageHeader
        eyebrow="ABOUT"
        title="About CargoVision"
        description="What this app does, where it can be wrong, and how to install it on a ChromeOS tablet."
      />
      <div className={styles.grid}>
        <Card aria-labelledby="how-heading">
          <h2 className={styles.heading} id="how-heading">
            <Icon name="info" /> How it works
          </h2>
          <ul className={styles.items}>
            <li>
              <strong>Read a label</strong>
              <span>
                Take a photo of a shipping label. CargoVision finds barcodes and
                reads the printed text, then explains the air waybill numbers,
                piece counts, weights, dimensions and handling terms it
                recognizes.
              </span>
            </li>
            <li>
              <strong>Measure a package</strong>
              <span>
                Photograph a package next to an object of known size, such as a
                sheet of paper. Mark that object, then the edge you want, and
                CargoVision estimates its length.
              </span>
            </li>
            <li>
              <strong>Stays on this device</strong>
              <span>
                Photos are read on this device. They are not saved or uploaded,
                and are discarded when you retake a photo or leave the screen.
              </span>
            </li>
          </ul>
        </Card>
        <Card aria-labelledby="limits-heading">
          <h2 className={styles.heading} id="limits-heading">
            <Icon name="alert" /> Keep in mind
          </h2>
          <ul className={styles.items}>
            <li>
              <strong>Reading can be wrong</strong>
              <span>
                Automatic reading can confuse similar characters, such as 0 and
                O. Check every detail against the label.
              </span>
            </li>
            <li>
              <strong>Measurements are estimates</strong>
              <span>
                They depend on a flat reference and a camera held straight above
                it. Use a tape measure for official dimensions.
              </span>
            </li>
            <li>
              <strong>Dangerous goods are not interpreted</strong>
              <span>
                CargoVision may point out dangerous goods wording, but it does
                not read hazard marks or labels. No notice does not mean a
                shipment has none.
              </span>
            </li>
            <li>
              <strong>The airline list is partial</strong>
              <span>
                Only some airline prefixes are recognized. An unrecognized
                prefix does not make an air waybill number wrong.
              </span>
            </li>
          </ul>
        </Card>
        <Card aria-labelledby="install-heading">
          <h2 className={styles.heading} id="install-heading">
            <Icon name="download" /> Install on ChromeOS
          </h2>
          <p className={styles.lead}>
            Open it like an app, and keep it working when the connection is not.
          </p>
          <ol className={styles.steps}>
            <li>
              <strong>Open it in Chrome</strong>
              <span>
                Use a trusted HTTPS address. The first visit needs a connection
                and downloads about 8 MB of reading tools.
              </span>
            </li>
            <li>
              <strong>Wait for &quot;Ready to use offline&quot;</strong>
              <span>
                Check the home screen before disconnecting. Development mode
                does not cache the app.
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
              <strong>Allow the camera</strong>
              <span>
                Chrome asks the first time you take a photo. You can also choose
                a photo from the device without the camera.
              </span>
            </li>
          </ol>
          <p className={styles.note}>
            Clearing browser data or removing the app can remove its offline
            copy.
          </p>
        </Card>
        <Card aria-labelledby="details-heading">
          <h2 className={styles.heading} id="details-heading">
            <Icon name="box" /> App details
          </h2>
          <dl className={styles.details}>
            <div>
              <dt>Application</dt>
              <dd>{appConfig.name}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{appConfig.version}</dd>
            </div>
            <div>
              <dt>Saved data</dt>
              <dd>None</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>Not needed</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  )
}
