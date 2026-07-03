import React from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'

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

test('auto-advances to the next use case after 4.5s', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)
  expect(screen.getByText('Restaurants & Food Trucks')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(4500)
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
  jest.useRealTimers()
})

test('stops auto-advancing after a manual chevron click', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)

  fireEvent.click(screen.getByLabelText('Next'))
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(10000)
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
  jest.useRealTimers()
})

test('stops auto-advancing after a manual swipe', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)

  act(() => {
    capturedSwipeConfig.onSwipedLeft()
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(10000)
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
  jest.useRealTimers()
})

test('stops auto-advancing after a dot indicator click', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)

  fireEvent.click(screen.getByLabelText('Go to Weddings & Stationery'))
  expect(screen.getByText('Weddings & Stationery')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(10000)
  })
  expect(screen.getByText('Weddings & Stationery')).toBeInTheDocument()
  jest.useRealTimers()
})

test('stops auto-advancing after clicking an adjacent card', () => {
  jest.useFakeTimers()
  render(<UseCasesCarousel />)

  fireEvent.click(screen.getByAltText('Music & Nightlife QR code example'))
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(10000)
  })
  expect(screen.getByText('Music & Nightlife')).toBeInTheDocument()
  jest.useRealTimers()
})
