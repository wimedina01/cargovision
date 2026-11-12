import { LinkButton } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'

export function NotFound() {
  return (
    <>
      <PageHeader
        eyebrow="404 / UNKNOWN ROUTE"
        title="Page not found"
        description="This address is not part of CargoVision."
      />
      <Card>
        <EmptyState
          icon="box"
          title="Back to familiar ground"
          action={<LinkButton to="/">Back to workspace</LinkButton>}
        >
          <p>
            Return to the workspace to find the screens available in this build.
          </p>
        </EmptyState>
      </Card>
    </>
  )
}
