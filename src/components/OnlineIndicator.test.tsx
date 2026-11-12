import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { OnlineIndicator } from './OnlineIndicator'

it('updates its text and accessible status on offline and online events', () => {
  let online = true
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
  render(<OnlineIndicator />)
  expect(
    screen.getByRole('status', { name: 'Connection: online' }),
  ).toHaveTextContent('Online')

  online = false
  fireEvent(window, new Event('offline'))
  expect(
    screen.getByRole('status', { name: 'Connection: offline' }),
  ).toHaveTextContent('Offline')

  online = true
  fireEvent(window, new Event('online'))
  expect(
    screen.getByRole('status', { name: 'Connection: online' }),
  ).toHaveTextContent('Online')
})

it('reads the initial offline signal without waiting for an event', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  render(<OnlineIndicator />)
  expect(
    screen.getByRole('status', { name: 'Connection: offline' }),
  ).toBeVisible()
})
