import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

it('routes Escape cancellation to the caller without confirming the action', () => {
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  const props = {
    title: 'Apply update?',
    description: 'Reload to install the downloaded version.',
    confirmLabel: 'Apply update',
    onCancel,
    onConfirm,
  }
  const { rerender } = render(<ConfirmDialog {...props} open />)
  const dialog = screen.getByRole('dialog', { name: 'Apply update?' })
  expect(dialog).toHaveAccessibleDescription(
    'Reload to install the downloaded version.',
  )

  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(onCancel).toHaveBeenCalledOnce()
  expect(onConfirm).not.toHaveBeenCalled()

  rerender(<ConfirmDialog {...props} open={false} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
