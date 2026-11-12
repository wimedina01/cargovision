import type { ReactNode } from 'react'
import { Icon } from './Icon'
import styles from './StatusBanner.module.css'

type Tone = 'info' | 'success' | 'warning' | 'error'

interface StatusBannerProps {
  tone?: Tone
  title: string
  children?: ReactNode
}

export function StatusBanner({
  tone = 'info',
  title,
  children,
}: StatusBannerProps) {
  return (
    <div
      className={`${styles.banner} ${styles[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon
        name={tone === 'success' ? 'check' : tone === 'info' ? 'info' : 'alert'}
      />
      <div>
        <strong>{title}</strong>
        {children && <div className={styles.content}>{children}</div>}
      </div>
    </div>
  )
}
