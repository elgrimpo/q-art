import React from 'react'
import { render, screen, act } from '@testing-library/react'

let capturedSwipeConfig = null
jest.mock('react-swipeable', () => ({
  useSwipeable: (config) => {
    capturedSwipeConfig = config
    return {}
  },
}))

import UseCasesCarousel from '../app/(main_pages)/generate/UseCasesCarousel'

afterEach(() => {
  capturedSwipeConfig = null
})

test('renders the first use case as the center card initially', () => {
  render(<UseCasesCarousel />)
  expect(screen.getByText('Restaurants & Food Trucks')).toBeInTheDocument()
})

test('swiping left advances to the next use case', () => {
  render(<UseCasesCarousel />)
  act(() => {
    capturedSwipeConfig.onSwipedLeft()
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
})

test('swiping right goes to the previous use case, wrapping to the last', () => {
  render(<UseCasesCarousel />)
  act(() => {
    capturedSwipeConfig.onSwipedRight()
  })
  expect(screen.getByText('Apparel & Merch')).toBeInTheDocument()
})
