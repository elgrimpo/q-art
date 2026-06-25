import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockGenerateImage = jest.fn()
jest.mock('@/_utils/ImagesUtils', () => ({ generateImage: (...a) => mockGenerateImage(...a) }))

jest.mock('../app/images/[imageId]/GeneratingModal', () => ({
  __esModule: true,
  default: ({ open, error, onRetry, onBack }) => (
    <div data-testid="generating-modal" data-open={String(open)} data-error={String(!!error)}>
      {error && <button onClick={onBack}>Back to image</button>}
      {error && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}))

// Stub StylesCard: render a plain button so we can click a style tile
jest.mock('@/app/(main_pages)/generate/(formComponents)/StylesCard', () => ({
  __esModule: true,
  default: ({ item, handleClick }) => (
    <button data-testid={`style-${item.title}`} onClick={() => handleClick(item)}>
      {item.title}
    </button>
  ),
}))

import IteratePanel from '../app/images/[imageId]/IteratePanel'

const IMAGE = {
  _id: 'img1',
  prompt: 'a cat',
  style_title: 'Ukiyo-e',
  style_prompt: 'Detailed, Graphic Novel, Cinematic, Ukiyo-e Flat Design',
  sd_model: 'colorful_v31_62333.safetensors',
  seed: 42,
  qr_weight: 0.5,
  content: 'https://example.com',
  negative_prompt: '',
}

const onOpen = jest.fn()
const onClose = jest.fn()

function renderPanel(isOpen = false) {
  return render(
    <IteratePanel image={IMAGE} isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGenerateImage.mockResolvedValue({ _id: 'newimg1' })
})

// --- Default panel ---

test('shows New Variation and Iterate this image in default state', () => {
  renderPanel()
  expect(screen.getByText('New Variation')).toBeInTheDocument()
  expect(screen.getByText('Iterate this image')).toBeInTheDocument()
})

test('clicking Iterate this image calls onOpen', () => {
  renderPanel()
  fireEvent.click(screen.getByText('Iterate this image'))
  expect(onOpen).toHaveBeenCalledTimes(1)
})

// --- Form panel ---

test('shows form fields when isOpen=true', () => {
  renderPanel(true)
  expect(screen.getByRole('textbox', { name: /prompt/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
})

test('prompt textarea is pre-filled from image', () => {
  renderPanel(true)
  expect(screen.getByRole('textbox', { name: /prompt/i })).toHaveValue('a cat')
})

test('back button calls onClose', () => {
  renderPanel(true)
  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

// --- GeneratingModal ---

test('GeneratingModal is not open in default state', () => {
  renderPanel()
  expect(screen.getByTestId('generating-modal')).toHaveAttribute('data-open', 'false')
})

// --- New Variation ---

test('New Variation fires generateImage with seed -1', async () => {
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => expect(mockGenerateImage).toHaveBeenCalledTimes(1))
  expect(mockGenerateImage.mock.calls[0][0].seed).toBe(-1)
})

test('New Variation fires generateImage with original image values', async () => {
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => expect(mockGenerateImage).toHaveBeenCalledTimes(1))
  const payload = mockGenerateImage.mock.calls[0][0]
  expect(payload.website).toBe('https://example.com')
  expect(payload.prompt).toBe('a cat')
})

// --- Iterate Generate: seed logic ---

test('Generate with style unchanged uses image.seed', async () => {
  renderPanel(true)
  fireEvent.click(screen.getByRole('button', { name: /generate/i }))
  await waitFor(() => expect(mockGenerateImage).toHaveBeenCalledTimes(1))
  expect(mockGenerateImage.mock.calls[0][0].seed).toBe(42)
})

test('Generate after style change uses seed -1', async () => {
  renderPanel(true)
  // Expand accordion and click a different style
  fireEvent.click(screen.getByText('Ukiyo-e')) // accordion trigger shows current style title
  fireEvent.click(screen.getByTestId('style-Expressionism'))
  fireEvent.click(screen.getByRole('button', { name: /generate/i }))
  await waitFor(() => expect(mockGenerateImage).toHaveBeenCalledTimes(1))
  expect(mockGenerateImage.mock.calls[0][0].seed).toBe(-1)
})

// --- Success / failure ---

test('on success navigates to new image', async () => {
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/images/newimg1'))
})

test('on failure GeneratingModal shows error state', async () => {
  mockGenerateImage.mockRejectedValueOnce(new Error('fail'))
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() =>
    expect(screen.getByTestId('generating-modal')).toHaveAttribute('data-error', 'true')
  )
})

test('Back to image after New Variation failure closes modal', async () => {
  mockGenerateImage.mockRejectedValueOnce(new Error('fail'))
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => screen.getByText('Back to image'))
  fireEvent.click(screen.getByText('Back to image'))
  expect(screen.getByTestId('generating-modal')).toHaveAttribute('data-open', 'false')
})

test('Back to image after iterate failure keeps modal closed and does not call onClose', async () => {
  mockGenerateImage.mockRejectedValueOnce(new Error('fail'))
  renderPanel(true)
  fireEvent.click(screen.getByRole('button', { name: /generate/i }))
  await waitFor(() => screen.getByText('Back to image'))
  fireEvent.click(screen.getByText('Back to image'))
  expect(screen.getByTestId('generating-modal')).toHaveAttribute('data-open', 'false')
  expect(onClose).not.toHaveBeenCalled()
})

test('Retry re-fires the same generateImage call', async () => {
  mockGenerateImage
    .mockRejectedValueOnce(new Error('fail'))
    .mockResolvedValueOnce({ _id: 'newimg2' })
  renderPanel()
  fireEvent.click(screen.getByText('New Variation'))
  await waitFor(() => screen.getByText('Retry'))
  fireEvent.click(screen.getByText('Retry'))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/images/newimg2'))
})
