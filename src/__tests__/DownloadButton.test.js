/**
 * DownloadButton component tests
 *
 * Strategy:
 * - Mock StyledIconButton with a plain <button> that calls the handleClick prop
 *   (the prop name DownloadButton passes to StyledIconButton).
 * - Mock upscaleImage from ImagesUtils (server-action module with server-only imports).
 * - Mock Amplitude to silence analytics calls.
 * - Use the real Zustand store and real calculateCredits to exercise credit logic.
 * - The download link in JSDOM can't actually trigger a file download, so the
 *   upscaleImage-and-download flow is tested by checking that upscaleImage is
 *   called with the right arguments; the actual download (link.click()) is skipped
 *   in that test via test.skip for the DOM trigger part.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ---- Amplitude ----
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

// ---- StyledIconButton — render a plain button that triggers handleClick ----
jest.mock('../_components/StyledIconButton', () => ({
  __esModule: true,
  default: ({ handleClick, type }) => (
    <button data-testid={`styled-icon-btn-${type}`} onClick={handleClick}>
      {type}
    </button>
  ),
}))

// ---- ImagesUtils (server action — mock the whole module) ----
const mockUpscaleImage = jest.fn()
jest.mock('../_utils/ImagesUtils', () => ({
  generateImage: jest.fn(),
  getImages: jest.fn(),
  getImageById: jest.fn(),
  deleteImage: jest.fn(),
  likeImage: jest.fn(),
  upscaleImage: (...args) => mockUpscaleImage(...args),
}))

// ---- Import component and store AFTER mocks are set ----
import { useStore } from '../store'
import DownloadButton from '../_components/actions/DownloadButton'

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                       */
/* -------------------------------------------------------------------------- */

/** A typical image that has never been downloaded at 512px */
const makeImage = (overrides = {}) => ({
  _id: 'img_001',
  width: 512,
  downloaded: false,
  image_url: 'https://example.com/image.png',
  ...overrides,
})

const defaultUser = { _id: 'user_001', credits: 100 }

/** Open the download dialog by clicking the stubbed StyledIconButton */
function openDialog() {
  fireEvent.click(screen.getByTestId('styled-icon-btn-download'))
}

// Silence console.log from the component's catch block
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
})
afterAll(() => {
  console.log.mockRestore()
})

beforeEach(() => {
  mockUpscaleImage.mockReset()
  // Reset store to a clean state
  useStore.setState({
    alert: { open: false, severity: 'info', message: '' },
    processingImages: [],
  })
})

/* -------------------------------------------------------------------------- */
/*                                  TESTS                                      */
/* -------------------------------------------------------------------------- */

describe('DownloadButton', () => {
  // ---- 1. Shows 10 credits for first-time download at current resolution ----
  test('shows 10 credits for first-time download at current resolution', () => {
    const image = makeImage({ downloaded: false, width: 512 })
    render(<DownloadButton image={image} user={defaultUser} />)

    openDialog()

    // Dialog should be open and show "Required credits: 10"
    expect(screen.getByText(/required credits:/i)).toBeInTheDocument()
    expect(screen.getByText(/required credits:\s*10/i)).toBeInTheDocument()
  })

  // ---- 2. Shows 0 credits when image is already downloaded at same resolution ----
  test('shows 0 credits when image is already downloaded at same resolution', () => {
    const image = makeImage({ downloaded: true, width: 512 })
    render(<DownloadButton image={image} user={defaultUser} />)

    openDialog()

    expect(screen.getByText(/required credits:\s*0/i)).toBeInTheDocument()
  })

  // ---- 3. Shows 25 credits after switching to 1024 (15 upscale + 10 download) ----
  test('shows 25 credits after switching to 1024 (15 upscale + 10 download)', () => {
    // Image at 512px, not yet downloaded
    const image = makeImage({ downloaded: false, width: 512 })
    render(<DownloadButton image={image} user={defaultUser} />)

    openDialog()

    // Initially at 512 (current width) → 10 credits
    expect(screen.getByText(/required credits:\s*10/i)).toBeInTheDocument()

    // Click the "1024 x 1024" toggle button
    fireEvent.click(screen.getByText('1024 x 1024'))

    // Now: upscale(1024)=15 + download(true)=10 = 25
    expect(screen.getByText(/required credits:\s*25/i)).toBeInTheDocument()
  })

  // ---- 4. Shows 30 credits after switching to 2048 (20 upscale + 10 download) ----
  test('shows 30 credits after switching to 2048 (20 upscale + 10 download)', () => {
    const image = makeImage({ downloaded: false, width: 512 })
    render(<DownloadButton image={image} user={defaultUser} />)

    openDialog()

    // Click the "2048 x 2048" toggle button
    fireEvent.click(screen.getByText('2048 x 2048'))

    // Now: upscale(2048)=20 + download(true)=10 = 30
    expect(screen.getByText(/required credits:\s*30/i)).toBeInTheDocument()
  })

  // ---- 5. Calls upscaleImage with correct image id, resolution, and user id ----
  test('calls upscaleImage with correct image id, resolution, and user id', async () => {
    const image = makeImage({ _id: 'img_xyz', width: 512, downloaded: false })
    const user = { _id: 'user_abc', credits: 50 }

    // upscaleImage resolves with a fake upscaled image
    const fakeUpscaled = { image_url: 'https://example.com/upscaled.png' }
    mockUpscaleImage.mockResolvedValueOnce(fakeUpscaled)

    // Stub document.body.appendChild/removeChild to swallow the download link click
    const origAppendChild = document.body.appendChild.bind(document.body)
    const origRemoveChild = document.body.removeChild.bind(document.body)
    jest.spyOn(document.body, 'appendChild').mockImplementation((el) => {
      if (el && el.tagName === 'A') return el // swallow the download link
      return origAppendChild(el)
    })
    jest.spyOn(document.body, 'removeChild').mockImplementation((el) => {
      if (el && el.tagName === 'A') return el
      return origRemoveChild(el)
    })

    render(<DownloadButton image={image} user={user} />)

    openDialog()

    // Switch to 1024 so we can verify the resolution arg
    fireEvent.click(screen.getByText('1024 x 1024'))

    // Click the Download button
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download/i }))
    })

    await waitFor(() => {
      expect(mockUpscaleImage).toHaveBeenCalledTimes(1)
    })

    expect(mockUpscaleImage).toHaveBeenCalledWith('img_xyz', 1024, 'user_abc')

    // Restore spies
    document.body.appendChild.mockRestore()
    document.body.removeChild.mockRestore()
  })
})
