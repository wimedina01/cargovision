import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import styles from './States.module.css'

interface EmptyStateProps {
  icon: IconName
  title: string
  children: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} width="32" height="32" />
      </span>
      <h2>{title}</h2>
      <div className={styles.description}>{children}</div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
