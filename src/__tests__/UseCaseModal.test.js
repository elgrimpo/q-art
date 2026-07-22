import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

let capturedSwipeConfig = null
jest.mock('react-swipeable', () => ({
  useSwipeable: (config) => {
    capturedSwipeConfig = config
    return {}
  },
}))

import UseCaseModal from '../_components/UseCaseModal'

const items = [
  { id: 'a', category: 'Restaurants', description: 'desc a', image: '/a.png', Icon: null },
  { id: 'b', category: 'Nightlife', description: 'desc b', image: '/b.png', Icon: null },
]

afterEach(() => {
  capturedSwipeConfig = null
})

test('renders the active item at the given index', () => {
  render(
    <UseCaseModal open items={items} index={0} onClose={jest.fn()} onNext={jest.fn()} onPrevious={jest.fn()} />
  )
  expect(screen.getByText('Restaurants')).toBeInTheDocument()
  expect(screen.getByText('desc a')).toBeInTheDocument()
})

test('renders nothing when closed', () => {
  render(
    <UseCaseModal open={false} items={items} index={0} onClose={jest.fn()} onNext={jest.fn()} onPrevious={jest.fn()} />
  )
  expect(screen.queryByText('Restaurants')).not.toBeInTheDocument()
})

test('swiping down calls onClose', () => {
  const onClose = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={onClose} onNext={jest.fn()} onPrevious={jest.fn()} />)
  capturedSwipeConfig.onSwipedDown()
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('swiping left calls onNext', () => {
  const onNext = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={jest.fn()} onNext={onNext} onPrevious={jest.fn()} />)
  capturedSwipeConfig.onSwipedLeft()
  expect(onNext).toHaveBeenCalledTimes(1)
})

test('swiping right calls onPrevious', () => {
  const onPrevious = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={jest.fn()} onNext={jest.fn()} onPrevious={onPrevious} />)
  capturedSwipeConfig.onSwipedRight()
  expect(onPrevious).toHaveBeenCalledTimes(1)
})

test('chevron clicks call onNext/onPrevious', () => {
  const onNext = jest.fn()
  const onPrevious = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={jest.fn()} onNext={onNext} onPrevious={onPrevious} />)
  fireEvent.click(screen.getByLabelText('Next'))
  fireEvent.click(screen.getByLabelText('Previous'))
  expect(onNext).toHaveBeenCalledTimes(1)
  expect(onPrevious).toHaveBeenCalledTimes(1)
})

test('close button calls onClose', () => {
  const onClose = jest.fn()
  render(<UseCaseModal open items={items} index={0} onClose={onClose} onNext={jest.fn()} onPrevious={jest.fn()} />)
  fireEvent.click(screen.getByLabelText('Close'))
  expect(onClose).toHaveBeenCalledTimes(1)
})
