import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appConfig } from '../config/appConfig'
import { usePwaStatus } from '../hooks/usePwaStatus'
import { reloadApp } from '../services/app/reloadApp'
import App from './App'

vi.mock('../hooks/usePwaStatus', () => ({ usePwaStatus: vi.fn() }))
vi.mock('../services/app/reloadApp')

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(usePwaStatus).mockReturnValue({
    status: 'development',
    error: null,
    updateAvailable: false,
    updating: false,
    applyUpdate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })
})

describe('application foundation', () => {
  it.each([
    ['/', 'A clearer view of your cargo.'],
    ['/inspection/new', 'New inspection'],
    ['/history', 'Inspection history'],
    ['/settings', 'Settings'],
    ['/diagnostics', 'Diagnostics'],
    ['/camera-test', 'Camera test'],
    ['/not-a-cargovision-route', 'Page not found'],
  ])('renders %s with an accessible page heading', (path, title) => {
    renderApp(path)

    const heading = screen.getByRole('heading', { level: 1, name: title })
    expect(heading).toHaveFocus()
    expect(document.title).toBe(`${title} | CargoVision`)
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeVisible()
  })

  it('labels the preview honestly and does not offer an active camera control', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.getByText('Early local proof of concept')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Camera Test' })).toBeDisabled()
    expect(screen.getByText('Coming in Milestone 2')).toBeVisible()
    expect(screen.queryByText('Resume Draft')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Start New Inspection/ }))
    expect(screen.getByText(/No inspection has been created/)).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /save|capture|confirm/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to workspace' }))
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'A clearer view of your cargo.',
      }),
    ).toBeVisible()
  })

  it('recovers from unknown routes through the workspace link', async () => {
    const user = userEvent.setup()
    renderApp('/missing/nested/page')
    await user.click(screen.getByRole('link', { name: 'Back to workspace' }))
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'A clearer view of your cargo.',
      }),
    ).toBeVisible()
  })

  it('renders configuration in settings without pretending preferences can be saved', () => {
    renderApp('/settings')
    expect(screen.getByText(appConfig.version, { exact: true })).toBeVisible()
    expect(screen.getByText(`Inches (${appConfig.defaultUnit})`)).toBeVisible()
    expect(screen.getByText('Preferences are not editable yet')).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /save/i }),
    ).not.toBeInTheDocument()
  })

  it('requires confirmation before applying an available offline update', async () => {
    const user = userEvent.setup()
    const applyUpdate = vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined)
    vi.mocked(usePwaStatus).mockReturnValue({
      status: 'ready',
      error: null,
      updateAvailable: true,
      updating: false,
      applyUpdate,
    })
    renderApp()

    expect(screen.getByText('Offline shell ready')).toBeVisible()
    expect(applyUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Review update' }))
    expect(
      screen.getByRole('dialog', { name: 'Reload CargoVision?' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(applyUpdate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Review update' }))
    await user.click(screen.getByRole('button', { name: 'Reload and update' }))
    expect(applyUpdate).toHaveBeenCalledOnce()
  })

  it('shows offline failures with a recovery action, not a ready indicator', async () => {
    const user = userEvent.setup()
    vi.mocked(usePwaStatus).mockReturnValue({
      status: 'error',
      error: 'Offline setup failed: insufficient storage.',
      updateAvailable: false,
      updating: false,
      applyUpdate: vi.fn<() => Promise<void>>(),
    })
    renderApp()

    expect(screen.getByRole('alert')).toHaveTextContent('insufficient storage')
    expect(screen.queryByText('Offline shell ready')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reload to retry' }))
    expect(reloadApp).toHaveBeenCalledOnce()
  })
})
