import React from 'react'
import { render, screen } from '@testing-library/react'
import GeneratingLoader from '../app/(main_pages)/generate/(formComponents)/GeneratingLoader'

test('renders the progress bar width proportional to percent', () => {
  render(<GeneratingLoader percent={42} />)
  expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '42%' })
})

test('clamps percent above 100 to 100%', () => {
  render(<GeneratingLoader percent={150} />)
  expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '100%' })
})

test('clamps negative percent to 0%', () => {
  render(<GeneratingLoader percent={-10} />)
  expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '0%' })
})

test('defaults to 0% when no percent prop is given', () => {
  render(<GeneratingLoader />)
  expect(screen.getByTestId('generation-progress-bar')).toHaveStyle({ width: '0%' })
})
