import React from 'react'
import { render, screen } from '@testing-library/react'
import HowItWorksPage from '../app/(marketing)/how-it-works/page'

test('renders the hero heading and subtitle', () => {
  render(<HowItWorksPage />)
  expect(screen.getByRole('heading', { level: 1, name: /How it works/i })).toBeInTheDocument()
  expect(
    screen.getByText('Create scannable QR artwork in a few simple steps.')
  ).toBeInTheDocument()
})

test('renders all 4 step-badge labels', () => {
  render(<HowItWorksPage />)
  for (const label of ['Describe', 'Generate', 'Refine', 'Unlock']) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
})

test('renders each step title, description, and checklist items', () => {
  render(<HowItWorksPage />)
  expect(screen.getByText('Describe your idea')).toBeInTheDocument()
  expect(screen.getByText('Review your result')).toBeInTheDocument()
  expect(screen.getByText('Fine-tune your result')).toBeInTheDocument()
  expect(screen.getByText('Unlock your image')).toBeInTheDocument()
  expect(screen.getByText('Enter your website')).toBeInTheDocument()
  expect(screen.getByText('Check scannability score')).toBeInTheDocument()
  expect(screen.getByText('Edit prompt')).toBeInTheDocument()
  expect(screen.getByText('Print-ready for menus, posters, packaging, and more')).toBeInTheDocument()
})

test('step 3 renders its two subsections (Create Variant, Iterate)', () => {
  render(<HowItWorksPage />)
  expect(screen.getByText('Create Variant')).toBeInTheDocument()
  expect(screen.getByText('Same settings')).toBeInTheDocument()
  expect(screen.getByText('Iterate')).toBeInTheDocument()
  expect(screen.getByText('Adjust QR code weight — more artistic ↔ more scannable')).toBeInTheDocument()
})

test('step 2 no longer lists "Generate a new variation" (moved under step 3)', () => {
  render(<HowItWorksPage />)
  expect(screen.queryByText('Generate a new variation')).not.toBeInTheDocument()
})

test('renders the 4 step images with their alt text', () => {
  render(<HowItWorksPage />)
  expect(
    screen.getByAltText(
      'QR AI generate form filled in with a website URL, an image description, and the Ukiyo-e style selected'
    )
  ).toBeInTheDocument()
  expect(screen.getByAltText('The iterate panel with prompt, style, and QR code weight slider')).toBeInTheDocument()
  expect(
    screen.getByAltText('An unlocked, watermark-free AI QR code art print used as a restaurant menu cover')
  ).toBeInTheDocument()
})

test('does not render the old "under the hood" pipeline section', () => {
  render(<HowItWorksPage />)
  expect(screen.queryByText(/Under the hood/i)).not.toBeInTheDocument()
})

test('renders the trimmed tips', () => {
  render(<HowItWorksPage />)
  expect(screen.getByText('Use a short URL.')).toBeInTheDocument()
  expect(screen.getByText('Raise QR weight for high-stakes uses.')).toBeInTheDocument()
})

test('CTA links to /generate', () => {
  render(<HowItWorksPage />)
  const cta = screen.getByRole('link', { name: /Try it free/i })
  expect(cta).toHaveAttribute('href', '/generate')
})
