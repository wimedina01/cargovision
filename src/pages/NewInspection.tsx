import { LinkButton } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'

export function NewInspection() {
  return (
    <>
      <PageHeader
        eyebrow="INSPECTION WORKFLOW"
        title="New inspection"
        description="The workspace is here. The capture workflow is the next step."
      />
      <Card>
        <StatusBanner tone="warning" title="Not available in this build">
          Coming in Milestone 2. No inspection has been created.
        </StatusBanner>
        <EmptyState
          icon="box"
          title="A foundation, not a live inspection"
          action={<LinkButton to="/">Back to workspace</LinkButton>}
        >
          <p>
            Camera capture, photos, notes, and saved drafts will arrive with
            local storage. This preview does not collect or save shipment
            information.
          </p>
        </EmptyState>
      </Card>
    </>
  )
}
