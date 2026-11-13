import { NavLink } from 'react-router-dom'
import type { PwaStatus } from '../hooks/usePwaStatus'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { OfflineStatus } from './OfflineStatus'
import styles from './AppHeader.module.css'

const tasks: { to: string; label: string; icon: IconName }[] = [
  { to: '/read', label: 'Read label', icon: 'tag' },
  { to: '/measure', label: 'Measure', icon: 'ruler' },
]

export function AppHeader({ pwaStatus }: { pwaStatus: PwaStatus }) {
  return (
    <header className={styles.header}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <div className={styles.topbar}>
        <p className={styles.brand}>
          <span className={styles.brandMark}>
            <Icon name="box" width="26" height="26" />
          </span>
          <span className={styles.brandName}>
            Cargo<span>Vision</span>
          </span>
        </p>
        <OfflineStatus status={pwaStatus} />
      </div>
      <nav aria-label="Choose a task" className={styles.tasks}>
        {tasks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.task} ${isActive ? styles.active : ''}`
            }
          >
            <Icon name={icon} width="28" height="28" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
