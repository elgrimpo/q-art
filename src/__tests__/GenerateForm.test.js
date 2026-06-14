/**
 * GenerateForm component tests
 *
 * Strategy:
 * - Mock heavy sub-components (StylesModal, SettingsModal, GeneratingLoader)
 *   to avoid rendering complex MUI/Zustand trees unrelated to this component.
 * - UrlPrompt is NOT mocked because we need its actual inputs to fire change
 *   events and test disabled/enabled state of the Generate button.
 * - The Zustand store (useStore) is real; we reset it between tests via
 *   useStore.setState so each test starts from a known state.
 * - generateImage is mocked at the module level because ImagesUtils is a
 *   "use server" file with server-only imports (next/cache, next/navigation).
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---- Next.js / auth mocks (must come before component import) ----
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  notFound: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { email: 'test@example.com' } },
    status: 'authenticated',
    update: jest.fn().mockResolvedValue({ user: {} }),
  }),
}))

// ---- Amplitude ----
jest.mock('@amplitude/analytics-browser', () => ({ track: jest.fn() }))

// ---- ImagesUtils (server action — mock the whole module) ----
const mockGenerateImage = jest.fn()
jest.mock('../_utils/ImagesUtils', () => ({
  generateImage: (...args) => mockGenerateImage(...args),
  getImages: jest.fn(),
  getImageById: jest.fn(),
  deleteImage: jest.fn(),
  likeImage: jest.fn(),
  unlockImage: jest.fn(),
}))

// ---- Heavy sub-components ----
jest.mock('../app/(main_pages)/generate/(formComponents)/StylesModal', () => ({
  __esModule: true,
  default: () => <div data-testid="styles-modal-stub" />,
}))
jest.mock('../app/(main_pages)/generate/(formComponents)/SettingsModal', () => ({
  __esModule: true,
  default: () => <div data-testid="settings-modal-stub" />,
}))
jest.mock('../app/(main_pages)/generate/(formComponents)/GeneratingLoader', () => ({
  __esModule: true,
  default: () => <div data-testid="generating-loader" />,
}))

// ---- Import component and store AFTER mocks are set ----
import { useStore } from '../store'
import GenerateForm from '../app/(main_pages)/generate/GenerateForm'

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                       */
/* -------------------------------------------------------------------------- */

/**
 * Helper to find the main Generate submit button (aria-label="generate").
 * We use getByLabelText on the exact aria-label to avoid matching the
 * "Generate random prompt" dice icon button inside UrlPrompt.
 */
function getGenerateBtn() {
  return screen.getByRole('button', { name: 'generate' })
}

/** Reset Zustand store to a clean state before each test */
function resetStore(overrides = {}) {
  useStore.setState({
    user: { id: 'user_123', is_guest: false },
    generateFormValues: {
      website: '',
      prompt: 'a random prompt', // non-empty so button enables when website is filled
      style_id: 1,
      style_title: 'Random',
      style_prompt: '',
      qr_weight: 0.0,
      negative_prompt: '',
      seed: -1,
      sd_model: 'cyberrealistic_v40_151857.safetensors',
    },
    generatingImage: false,
    alert: { open: false, severity: 'info', message: '' },
    ...overrides,
  })
}

// Suppress expected console.error calls from the component's own error handler
// (e.g. handleGenerate logs before branching on error.message).
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterAll(() => {
  console.error.mockRestore()
})

beforeEach(() => {
  resetStore()
  mockPush.mockClear()
  mockGenerateImage.mockReset()
})

/* -------------------------------------------------------------------------- */
/*                                  TESTS                                      */
/* -------------------------------------------------------------------------- */

describe('GenerateForm', () => {
  // ---- 1. Basic rendering ----
  test('renders website input, prompt input, and generate button', () => {
    render(<GenerateForm />)

    // Website field: TextField with id="website"
    expect(screen.getByRole('textbox', { name: /website/i })).toBeInTheDocument()
    // Prompt field: TextField with id="prompt"
    expect(screen.getByRole('textbox', { name: /prompt/i })).toBeInTheDocument()
    // Generate button: has aria-label="generate"
    expect(getGenerateBtn()).toBeInTheDocument()
  })

  // ---- 2. Generate button disabled when website is empty ----
  test('generate button is disabled when website is empty', () => {
    // Store default has website: ''
    render(<GenerateForm />)
    const btn = getGenerateBtn()
    expect(btn).toBeDisabled()
  })

  // ---- 3. Generate button enabled when both fields are filled ----
  test('generate button is enabled when website and prompt are both filled', async () => {
    render(<GenerateForm />)
    const websiteInput = screen.getByRole('textbox', { name: /website/i })

    await act(async () => {
      fireEvent.change(websiteInput, { target: { name: 'website', value: 'example.com' } })
    })

    // The useEffect watches generateFormValues — after the change the store
    // should have website='example.com' and prompt is already non-empty.
    await waitFor(() => {
      expect(getGenerateBtn()).not.toBeDisabled()
    })
  })

  // ---- 4. Calls generateImage on click (happy path) ----
  test('calls generateImage with form values on generate click', async () => {
    const fakeImage = { _id: 'img_abc' }
    mockGenerateImage.mockResolvedValueOnce(fakeImage)

    // Pre-fill store with both website and prompt so button is enabled
    resetStore({
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 2,
        style_title: 'Anime',
        style_prompt: 'anime style',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
        sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })

    render(<GenerateForm />)
    const btn = getGenerateBtn()

    await act(async () => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalledTimes(1)
    })

    // First arg to generateImage should contain the form values
    const [formArg] = mockGenerateImage.mock.calls[0]
    expect(formArg.website).toBe('example.com')
    expect(formArg.prompt).toBe('a dragon')
  })

  // ---- 5. Shows generating loader when generatingImage is true ----
  test('shows GeneratingLoader (and hides form) when generatingImage is true', () => {
    resetStore({ generatingImage: true })
    render(<GenerateForm />)

    expect(screen.getByTestId('generating-loader')).toBeInTheDocument()
    // The form inputs should not be visible
    expect(screen.queryByRole('textbox', { name: /website/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'generate' })).not.toBeInTheDocument()
  })

  // ---- 6. Logged-in users have no client-side credit gate — generation proceeds ----
  test('calls generateImage even when logged-in user has no credits field', async () => {
    const fakeImage = { _id: 'img_abc' }
    mockGenerateImage.mockResolvedValueOnce(fakeImage)

    // No credits field on user — logged-in users are no longer credit-gated on the frontend
    resetStore({
      user: { id: 'user_123', is_guest: false },
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 2,
        style_title: 'Anime',
        style_prompt: 'anime style',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
        sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })

    render(<GenerateForm />)

    await act(async () => {
      fireEvent.click(getGenerateBtn())
    })

    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalledTimes(1)
    })
  })

  // ---- 7. Shows "Sign in to keep going" dialog when backend rejects with InsufficientCredits error ----
  test('shows "Sign in to keep going" dialog when backend rejects with InsufficientCredits error', async () => {
    mockGenerateImage.mockRejectedValueOnce(new Error('InsufficientCredits'))

    resetStore({
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 2,
        style_title: 'Anime',
        style_prompt: 'anime style',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
        sd_model: 'cyberrealistic_v40_151857.safetensors',
      },
    })

    render(<GenerateForm />)

    await act(async () => {
      fireEvent.click(getGenerateBtn())
    })

    await waitFor(() => {
      expect(screen.getByText('Sign in to keep going')).toBeInTheDocument()
    })
  })
})
