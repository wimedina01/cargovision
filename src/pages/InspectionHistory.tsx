import { LinkButton } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'

export function InspectionHistory() {
  return (
    <>
      <PageHeader
        eyebrow="YOUR LOCAL WORK"
        title="Inspection history"
        description="A future home for your drafts and completed inspections."
      />
      <Card>
        <EmptyState
          icon="history"
          title="History arrives in Milestone 2"
          action={<LinkButton to="/">Back to workspace</LinkButton>}
        >
          <p>
            This foundation does not create or store inspection records.
            Resuming, filtering, exporting, and deleting inspections are not
            available yet. No sample shipment data is shown.
          </p>
        </EmptyState>
      </Card>
    </>
  )
}
