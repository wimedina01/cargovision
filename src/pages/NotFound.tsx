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
          action={<LinkButton to="/">Back to home</LinkButton>}
        >
          <p>
            Go back to the home screen to read a label or measure a package.
          </p>
        </EmptyState>
      </Card>
    </>
  )
}
