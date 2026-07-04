import React from 'react'
import { render, screen } from '@testing-library/react'
import NoCodesEmptyState from '../app/(main_pages)/mycodes/NoCodesEmptyState'

test('shows the "No codes yet" heading with "first" highlighted', () => {
  render(<NoCodesEmptyState />)
  expect(screen.getByText(/no codes yet/i)).toBeInTheDocument()
  expect(screen.getByText('first')).toBeInTheDocument()
})

test('shows the subtitle without the "in just a few seconds" line', () => {
  render(<NoCodesEmptyState />)
  expect(
    screen.getByText('Turn your ideas into stunning, scannable art.')
  ).toBeInTheDocument()
  expect(screen.queryByText(/in just a few seconds/i)).not.toBeInTheDocument()
})

test('primary CTA links to /generate and reads "Generate Your First Code"', () => {
  render(<NoCodesEmptyState />)
  const cta = screen.getByRole('link', { name: /generate your first code/i })
  expect(cta).toHaveAttribute('href', '/generate')
})

test('secondary link reads "Explore images" (not "Explore Community") and links to /explore', () => {
  render(<NoCodesEmptyState />)
  const exploreLink = screen.getByRole('link', { name: /explore images/i })
  expect(exploreLink).toHaveAttribute('href', '/explore')
  expect(screen.queryByText(/explore community/i)).not.toBeInTheDocument()
})
