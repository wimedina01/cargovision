import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { reloadApp } from '../services/app/reloadApp'
import { ErrorBoundary } from './ErrorBoundary'

vi.mock('../services/app/reloadApp')

function BrokenScreen(): never {
  throw new Error('Test rendering failure')
}

it('logs a rendering failure and provides a visible recovery action', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const user = userEvent.setup()

  render(
    <ErrorBoundary>
      <BrokenScreen />
    </ErrorBoundary>,
  )

  expect(
    screen.getByRole('heading', { name: 'Something went wrong' }),
  ).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'could not display this screen',
  )
  expect(log).toHaveBeenCalledWith(
    'CargoVision encountered a rendering error.',
    expect.any(Error),
    expect.any(Object),
  )
  await user.click(screen.getByRole('button', { name: 'Reload app' }))
  expect(reloadApp).toHaveBeenCalledOnce()
  expect(screen.getByRole('link', { name: 'Start over' })).toHaveAttribute(
    'href',
    '/',
  )
})
