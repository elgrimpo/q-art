import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminMyCodesMenu from '../app/(main_pages)/mycodes/AdminMyCodesMenu'

test('renders an icon trigger labeled "Admin menu"', () => {
  render(<AdminMyCodesMenu trigger="icon" myCodesOnly={true} onToggle={jest.fn()} />)
  expect(screen.getByLabelText('Admin menu')).toBeInTheDocument()
})

test('renders a fab trigger labeled "Admin menu"', () => {
  render(<AdminMyCodesMenu trigger="fab" myCodesOnly={true} onToggle={jest.fn()} />)
  expect(screen.getByLabelText('Admin menu')).toBeInTheDocument()
})

test('shows the "My codes" switch checked when myCodesOnly is true', async () => {
  render(<AdminMyCodesMenu trigger="icon" myCodesOnly={true} onToggle={jest.fn()} />)
  fireEvent.click(screen.getByLabelText('Admin menu'))
  expect(await screen.findByRole('switch', { name: /my codes/i })).toBeChecked()
})

test('shows the "My codes" switch unchecked when myCodesOnly is false', async () => {
  render(<AdminMyCodesMenu trigger="icon" myCodesOnly={false} onToggle={jest.fn()} />)
  fireEvent.click(screen.getByLabelText('Admin menu'))
  expect(await screen.findByRole('switch', { name: /my codes/i })).not.toBeChecked()
})

test('toggling the switch calls onToggle with the flipped value and closes the menu', async () => {
  const onToggle = jest.fn()
  render(<AdminMyCodesMenu trigger="icon" myCodesOnly={true} onToggle={onToggle} />)
  fireEvent.click(screen.getByLabelText('Admin menu'))

  const toggle = await screen.findByRole('switch', { name: /my codes/i })
  fireEvent.click(toggle)

  expect(onToggle).toHaveBeenCalledWith(false)
  await waitFor(() =>
    expect(screen.queryByRole('switch', { name: /my codes/i })).not.toBeInTheDocument()
  )
})
