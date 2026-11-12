import { Link, NavLink } from 'react-router-dom'
import { appConfig } from '../config/appConfig'
import { Icon } from './Icon'
import { OnlineIndicator } from './OnlineIndicator'
import styles from './AppHeader.module.css'

export function AppHeader() {
  return (
    <header className={styles.header}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <div className={styles.topbar}>
        <Link className={styles.brand} to="/" aria-label="CargoVision home">
          <span className={styles.brandMark}>
            <Icon name="box" width="29" height="29" />
          </span>
          <span>
            <span className={styles.brandName}>
              Cargo<span>Vision</span>
            </span>
            <span className={styles.brandCaption}>CARGO ACCEPTANCE</span>
          </span>
        </Link>
        <div className={styles.headerMeta}>
          <span className={styles.localLabel}>
            <Icon name="shield" width="18" height="18" />
            Works on this device
          </span>
          <OnlineIndicator />
        </div>
      </div>
      <div className={styles.navbar}>
        <nav aria-label="Main navigation" className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <Icon name="home" width="20" height="20" />
            Home
          </NavLink>
          <NavLink
            to="/read"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <Icon name="tag" width="20" height="20" />
            Read label
          </NavLink>
          <NavLink
            to="/measure"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <Icon name="ruler" width="20" height="20" />
            Measure
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <Icon name="info" width="20" height="20" />
            About
          </NavLink>
        </nav>
        <span className={styles.release}>v{appConfig.version}</span>
      </div>
    </header>
  )
}
