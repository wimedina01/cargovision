import type { ReactNode } from 'react'
import { StatusBanner } from './StatusBanner'

interface ErrorStateProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function ErrorState({ title, children, action }: ErrorStateProps) {
  return (
    <StatusBanner tone="error" title={title}>
      <div>{children}</div>
      {action}
    </StatusBanner>
  )
}
