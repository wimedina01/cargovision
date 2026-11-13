import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderApp(path = '/read') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function heading(name: string) {
  return screen.getByRole('heading', { level: 1, name })
}

function mockPwa(overrides: Partial<ReturnType<typeof usePwaStatus>> = {}) {
  const pwa = {
    status: 'development' as const,
    error: null,
    updateAvailable: false,
    updating: false,
    applyUpdate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    ...overrides,
  }
  vi.mocked(usePwaStatus).mockReturnValue(pwa)
  return pwa
}

beforeEach(() => {
  vi.mocked(warmUpOcr).mockResolvedValue(undefined)
  mockPwa()
})

describe('application shell', () => {
  it.each([
    ['/read', 'Read a label'],
    ['/measure', 'Measure a package'],
  ])('renders %s with an accessible page heading', (path, title) => {
    renderApp(path)

    expect(heading(title)).toHaveFocus()
    expect(document.title).toBe(`${title} | CargoVision`)
  })

  it.each(['/', '/about', '/not-a-cargovision-route'])(
    'opens the label reader instead of %s',
    (path) => {
      renderApp(path)

      expect(heading('Read a label')).toHaveFocus()
    },
  )

  it('offers only the two tasks and switches between them', async () => {
    const user = userEvent.setup()
    renderApp()
    const tasks = screen.getByRole('navigation', { name: 'Choose a task' })
    const read = within(tasks).getByRole('link', { name: 'Read label' })
    const measure = within(tasks).getByRole('link', { name: 'Measure' })

    expect(within(tasks).getAllByRole('link')).toHaveLength(2)
    expect(read).toHaveAttribute('aria-current', 'page')

    await user.click(measure)
    expect(heading('Measure a package')).toHaveFocus()
    expect(measure).toHaveAttribute('aria-current', 'page')
    expect(read).not.toHaveAttribute('aria-current')

    await user.click(read)
    expect(heading('Read a label')).toHaveFocus()
  })

  it('lets a photo be chosen where the browser has no camera', () => {
    renderApp('/read')

    expect(screen.getByText('This browser cannot use the camera')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeEnabled()
  })

  it.each([
    ['ready', 'Ready to use offline'],
    ['preparing', 'Preparing offline use...'],
  ] as const)('says so when offline use is %s', (status, message) => {
    mockPwa({ status })
    renderApp()

    expect(screen.getByText(message)).toBeVisible()
  })

  it.each(['development', 'unsupported'] as const)(
    'does not claim offline readiness while the app is %s',
    (status) => {
      mockPwa({ status })
      renderApp()

      expect(
        screen.queryByText(/ready to use offline|preparing offline/i),
      ).not.toBeInTheDocument()
    },
  )

  it('requires confirmation before applying an available offline update', async () => {
    const user = userEvent.setup()
    const { applyUpdate } = mockPwa({ status: 'ready', updateAvailable: true })
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
    mockPwa({
      status: 'error',
      error: 'Offline setup failed: insufficient storage.',
    })
    renderApp()

    expect(screen.getByRole('alert')).toHaveTextContent('insufficient storage')
    expect(screen.queryByText('Ready to use offline')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reload to retry' }))
    expect(reloadApp).toHaveBeenCalledOnce()
  })
})
