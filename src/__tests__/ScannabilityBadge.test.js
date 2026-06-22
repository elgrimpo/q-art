import React from 'react'
import { render, screen } from '@testing-library/react'
import ScannabilityBadge from '../_components/ScannabilityBadge'

describe('ScannabilityBadge', () => {
  test('renders nothing when score is null', () => {
    const { container } = render(<ScannabilityBadge score={null} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when score is undefined', () => {
    const { container } = render(<ScannabilityBadge score={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  test('shows "Excellent" for score 90', () => {
    render(<ScannabilityBadge score={90} />)
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })

  test('shows "Good" for score 75', () => {
    render(<ScannabilityBadge score={75} />)
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  test('shows "Fair" for score 60', () => {
    render(<ScannabilityBadge score={60} />)
    expect(screen.getByText('Fair')).toBeInTheDocument()
  })

  test('shows "Poor" for score 35', () => {
    render(<ScannabilityBadge score={35} />)
    expect(screen.getByText('Poor')).toBeInTheDocument()
  })

  test('shows "Unscannable" for score 10', () => {
    render(<ScannabilityBadge score={10} />)
    expect(screen.getByText('Unscannable')).toBeInTheDocument()
  })

  test('shows "Unscannable" for score 0', () => {
    render(<ScannabilityBadge score={0} />)
    expect(screen.getByText('Unscannable')).toBeInTheDocument()
  })

  test('shows "Good" at the boundary score 70', () => {
    render(<ScannabilityBadge score={70} />)
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  test('shows "Excellent" at the boundary score 85', () => {
    render(<ScannabilityBadge score={85} />)
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })

  test('renders 5 squares', () => {
    const { container } = render(<ScannabilityBadge score={75} />)
    // Each square has data-testid="score-square"
    const squares = container.querySelectorAll('[data-testid="score-square"]')
    expect(squares).toHaveLength(5)
  })
})
