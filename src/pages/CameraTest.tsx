import { LinkButton } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'

export function CameraTest() {
  return (
    <>
      <PageHeader
        eyebrow="DEVICE TOOLS"
        title="Camera test"
        description="Rear-camera preview and capture checks are planned for the next milestone."
      />
      <Card>
        <StatusBanner tone="warning" title="Camera access is disabled">
          Coming in Milestone 2. CargoVision does not request camera permission
          in this build.
        </StatusBanner>
        <EmptyState
          icon="camera"
          title="Your camera can wait"
          action={<LinkButton to="/">Back to workspace</LinkButton>}
        >
          <p>
            Live preview, camera switching, high-resolution capture, and
            permission troubleshooting are not implemented yet.
          </p>
        </EmptyState>
      </Card>
    </>
  )
}
