import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { Icon } from './Icon'
import styles from './OnlineIndicator.module.css'

export function OnlineIndicator() {
  const online = useOnlineStatus()

  return (
    <span
      className={`${styles.indicator} ${online ? styles.online : styles.offline}`}
      role="status"
      aria-label={`Connection: ${online ? 'online' : 'offline'}`}
      title="Browser connection signal, not a server connectivity check."
    >
      <Icon name={online ? 'wifi' : 'wifiOff'} width="18" height="18" />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
