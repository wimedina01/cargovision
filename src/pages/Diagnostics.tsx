import { LinkButton } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { appConfig } from '../config/appConfig'

export function Diagnostics() {
  return (
    <>
      <PageHeader
        eyebrow="DEVELOPER TOOLS"
        title="Diagnostics"
        description="Field-test diagnostics are reserved for a later milestone."
      />
      <Card>
        <EmptyState
          icon="info"
          title={
            appConfig.developerMode
              ? 'Diagnostics arrive in Milestone 6'
              : 'Developer mode is off'
          }
          action={<LinkButton to="/">Back to workspace</LinkButton>}
        >
          <p>
            {appConfig.developerMode
              ? 'Developer mode is on. Camera, processing, and device diagnostics are not implemented in this foundation build.'
              : 'Diagnostics are developer-only and are not implemented in this foundation build. No detailed device information is collected.'}
          </p>
        </EmptyState>
      </Card>
    </>
  )
}
