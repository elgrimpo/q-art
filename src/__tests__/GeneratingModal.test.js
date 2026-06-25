import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// GeneratingLoader uses a GIF background — stub it so jsdom doesn't choke
jest.mock(
  '@/app/(main_pages)/generate/(formComponents)/GeneratingLoader',
  () => ({ __esModule: true, default: () => <div data-testid="generating-loader" /> })
)

import GeneratingModal from '../app/images/[imageId]/GeneratingModal'

test('shows generating loader when not in error state', () => {
  render(<GeneratingModal open error={false} onRetry={jest.fn()} onBack={jest.fn()} />)
  expect(screen.getByTestId('generating-loader')).toBeInTheDocument()
  expect(screen.queryByText('Retry')).not.toBeInTheDocument()
})

test('shows error state with Retry and Back to image buttons', () => {
  render(<GeneratingModal open error onRetry={jest.fn()} onBack={jest.fn()} />)
  expect(screen.queryByTestId('generating-loader')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /back to image/i })).toBeInTheDocument()
})

test('Retry button calls onRetry', () => {
  const onRetry = jest.fn()
  render(<GeneratingModal open error onRetry={onRetry} onBack={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /retry/i }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})

test('Back to image button calls onBack', () => {
  const onBack = jest.fn()
  render(<GeneratingModal open error onRetry={jest.fn()} onBack={onBack} />)
  fireEvent.click(screen.getByRole('button', { name: /back to image/i }))
  expect(onBack).toHaveBeenCalledTimes(1)
})

test('does not render content when open=false', () => {
  render(<GeneratingModal open={false} error={false} onRetry={jest.fn()} onBack={jest.fn()} />)
  expect(screen.queryByTestId('generating-loader')).not.toBeInTheDocument()
})
