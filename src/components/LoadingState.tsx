import styles from './States.module.css'

export function LoadingState({ label = 'Loading CargoVision...' }) {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
