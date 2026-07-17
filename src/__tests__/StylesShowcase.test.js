import React from 'react'
import { render, screen } from '@testing-library/react'
import StylesShowcase from '../app/(main_pages)/generate/StylesShowcase'

test('renders the section heading and subtitle', () => {
  render(<StylesShowcase />)
  expect(screen.getByText('Find Your Style')).toBeInTheDocument()
  expect(
    screen.getByText(
      'Each style is crafted to be beautiful and scannable. Pick one and start creating.'
    )
  ).toBeInTheDocument()
})

test('renders one card per style with a landing page (13 total)', () => {
  render(<StylesShowcase />)
  expect(screen.getAllByRole('link')).toHaveLength(13)
})

test('each card links to its /styles/[slug] landing page', () => {
  render(<StylesShowcase />)
  const title = screen.getByText('Ukiyo-e')
  expect(title.closest('a')).toHaveAttribute('href', '/styles/ukiyo-e-qr-code')
})

test('renders each style tagline', () => {
  render(<StylesShowcase />)
  expect(screen.getByText('Classic Japanese woodblock prints.')).toBeInTheDocument()
  expect(screen.getByText('Neon lights and futuristic urban vibes.')).toBeInTheDocument()
})

test('the Ghibli card shows "Whimsical Anime", never "Ghibli"', () => {
  render(<StylesShowcase />)
  const title = screen.getByText('Whimsical Anime')
  expect(title.closest('a')).toHaveAttribute('href', '/styles/ghibli-qr-code')
  expect(screen.queryByText('Ghibli')).not.toBeInTheDocument()
})
