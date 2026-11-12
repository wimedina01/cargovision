import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { reloadApp } from '../services/app/reloadApp'
import styles from './App.module.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CargoVision encountered a rendering error.', error, info)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className={styles.errorShell}>
          <Card>
            <h1>Something went wrong</h1>
            <ErrorState
              title="CargoVision could not display this screen."
              action={<Button onClick={reloadApp}>Reload app</Button>}
            >
              Reload to try again. If the problem continues, return to the
              workspace and report what happened.
            </ErrorState>
            <a className={styles.recoveryLink} href="/">
              Return to workspace
            </a>
          </Card>
        </main>
      )
    }

    return this.props.children
  }
}
