import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const mockSetIterateSession = jest.fn()
const mockClearIterateSession = jest.fn()
jest.mock('@/store', () => ({
  useStore: (selector) =>
    selector({
      iterateSession: null,
      setIterateSession: mockSetIterateSession,
      clearIterateSession: mockClearIterateSession,
    }),
}))

jest.mock('@/_utils/ImagesUtils', () => ({ generateImage: jest.fn() }))

jest.mock('@/_utils/qrWeight', () => ({
  qrWeightToSlider: (w) => w,
  QR_SLIDER_MIN: 0,
  QR_SLIDER_MAX: 1,
}))

jest.mock('@/_utils/ImageStyles', () => ({
  styles: [
    { id: 1, title: 'Random', prompt: '', loras: [], sd_model: 'model.safetensors', image_url: '' },
    { id: 2, title: 'Photorealistic', prompt: 'photo', loras: [], sd_model: 'model.safetensors', image_url: '' },
  ],
  selectRandomStyle: jest.fn(() => ({
    id: 2, title: 'Photorealistic', prompt: 'photo', loras: [], sd_model: 'model.safetensors',
  })),
}))

import IteratePanel from '../app/images/[imageId]/IteratePanel'

const IMAGE = {
  _id: 'img1',
  content: 'https://example.com',
  prompt: 'a beautiful forest',
  style_title: 'Photorealistic',
  qr_weight: 0.5,
}

beforeEach(() => jest.clearAllMocks())

// ─── Default panel (isOpen=false) ────────────────────────────────────────────

describe('default panel — owner', () => {
  it('shows New Variation and Iterate this image', () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={jest.fn()} isOwner={true} />)
    expect(screen.getByText('New Variation')).toBeInTheDocument()
    expect(screen.getByText('Iterate this image')).toBeInTheDocument()
  })
})

describe('default panel — non-owner', () => {
  it('hides New Variation', () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={jest.fn()} isOwner={false} />)
    expect(screen.queryByText('New Variation')).not.toBeInTheDocument()
  })

  it('shows Make it your own', () => {
    render(<IteratePanel image={IMAGE} isOpen={false} onOpen={jest.fn()} isOwner={false} />)
    expect(screen.getByText('Make it your own')).toBeInTheDocument()
  })
})

// ─── Form panel (isOpen=true) ─────────────────────────────────────────────────

describe('form panel — owner', () => {
  it('URL field is disabled and pre-filled with image.content', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={true} />
    )
    const urlInput = screen.getByLabelText('URL')
    expect(urlInput).toBeDisabled()
    expect(urlInput.value).toBe('https://example.com')
  })

  it('Generate button is enabled when prompt is non-empty', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={true} />
    )
    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled()
  })
})

describe('form panel — non-owner', () => {
  it('shows Make it your own as form title', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    // The form header uses the same text as the button
    expect(screen.getAllByText('Make it your own').length).toBeGreaterThan(0)
  })

  it('URL field is empty and editable', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    const urlInput = screen.getByLabelText('URL')
    expect(urlInput).not.toBeDisabled()
    expect(urlInput.value).toBe('')
  })

  it('Generate button is disabled when URL is empty', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })

  it('Generate button enables after URL is typed', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://mysite.com' } })
    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled()
  })

  it('prompt is pre-filled with source image prompt', () => {
    render(
      <IteratePanel image={IMAGE} isOpen={true} onOpen={jest.fn()} onClose={jest.fn()} isOwner={false} />
    )
    const promptInput = screen.getByLabelText('prompt')
    expect(promptInput.value).toBe('a beautiful forest')
  })
})
