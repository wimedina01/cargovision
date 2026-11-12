import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appConfig } from '../config/appConfig'
import { usePwaStatus } from '../hooks/usePwaStatus'
import { reloadApp } from '../services/app/reloadApp'
import type * as Ocr from '../services/vision/ocr'
import { warmUpOcr } from '../services/vision/ocr'
import App from './App'

vi.mock('../hooks/usePwaStatus', () => ({ usePwaStatus: vi.fn() }))
vi.mock('../services/app/reloadApp')
vi.mock('../services/vision/ocr', async (importOriginal) => ({
  ...(await importOriginal<typeof Ocr>()),
  warmUpOcr: vi.fn(),
  cancelOcr: vi.fn(),
}))

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function heading(name: string) {
  return screen.getByRole('heading', { level: 1, name })
}

beforeEach(() => {
  vi.mocked(warmUpOcr).mockResolvedValue(undefined)
  vi.mocked(usePwaStatus).mockReturnValue({
    status: 'development',
    error: null,
    updateAvailable: false,
    updating: false,
    applyUpdate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  })
})

describe('application shell', () => {
  it.each([
    ['/', 'Check a package'],
    ['/read', 'Read a label'],
    ['/measure', 'Measure a package'],
    ['/about', 'About CargoVision'],
    ['/not-a-cargovision-route', 'Page not found'],
  ])('renders %s with an accessible page heading', (path, title) => {
    renderApp(path)

    expect(heading(title)).toHaveFocus()
    expect(document.title).toBe(`${title} | CargoVision`)
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeVisible()
  })

  it('moves between the screens from the main navigation', async () => {
    const user = userEvent.setup()
    renderApp()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })

    await user.click(within(nav).getByRole('link', { name: 'Read label' }))
    expect(heading('Read a label')).toHaveFocus()
    await user.click(within(nav).getByRole('link', { name: 'Measure' }))
    expect(heading('Measure a package')).toHaveFocus()
    await user.click(within(nav).getByRole('link', { name: 'About' }))
    expect(heading('About CargoVision')).toHaveFocus()
    await user.click(within(nav).getByRole('link', { name: 'Home' }))
    expect(heading('Check a package')).toHaveFocus()
  })

  it('offers the two tasks from the home screen', async () => {
    const user = userEvent.setup()
    renderApp()
    const main = screen.getByRole('main')

    await user.click(within(main).getByRole('link', { name: 'Read a label' }))
    expect(heading('Read a label')).toBeVisible()

    await user.click(screen.getByRole('link', { name: 'CargoVision home' }))
    await user.click(within(main).getByRole('link', { name: 'Measure' }))
    expect(heading('Measure a package')).toBeVisible()
  })

  it('recovers from unknown routes through the home link', async () => {
    const user = userEvent.setup()
    renderApp('/missing/nested/page')

    await user.click(screen.getByRole('link', { name: 'Back to home' }))

    expect(heading('Check a package')).toBeVisible()
  })

  it('lets a photo be chosen where the browser has no camera', () => {
    renderApp('/read')

    expect(screen.getByText('This browser cannot use the camera')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeEnabled()
  })

  it('describes the app without promising anything it does not do', () => {
    renderApp('/about')

    expect(screen.getByText(appConfig.version, { exact: true })).toBeVisible()
    expect(
      screen.getByText('Dangerous goods are not interpreted'),
    ).toBeVisible()
    expect(screen.getByText('Measurements are estimates')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /save|sign in/i }),
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

    expect(screen.getByText('Ready to use offline')).toBeVisible()
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
    expect(screen.queryByText('Ready to use offline')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reload to retry' }))
    expect(reloadApp).toHaveBeenCalledOnce()
  })
})
