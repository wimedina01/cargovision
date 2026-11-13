import styles from './PageTitle.module.css'

/** The screen's h1: hidden from sight, but used by screen readers and the document title. */
export function PageTitle({ children }: { children: string }) {
  return (
    <h1 className={styles.title} tabIndex={-1}>
      {children}
    </h1>
  )
}
