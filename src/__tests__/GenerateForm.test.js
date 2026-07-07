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
 * - startGeneration/getGenerationProgress are mocked at the module level
 *   because ImagesUtils is a "use server" file with server-only imports
 *   (next/cache, next/navigation).
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as amplitude from '@amplitude/analytics-browser'

// GenerateForm measures its form box via ResizeObserver (to lock the
// container's height while showing the loader); jsdom doesn't implement it.
global.ResizeObserver =
  global.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

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
const mockStartGeneration = jest.fn()
const mockGetGenerationProgress = jest.fn()
jest.mock('../_utils/ImagesUtils', () => ({
  startGeneration: (...args) => mockStartGeneration(...args),
  getGenerationProgress: (...args) => mockGetGenerationProgress(...args),
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
jest.mock('../app/(main_pages)/generate/(formComponents)/GeneratingLoader', () => ({
  __esModule: true,
  default: ({ percent }) => <div data-testid="generating-loader" data-percent={percent} />,
}))

// ---- Import component and store AFTER mocks are set ----
import { useStore } from '../store'
import GenerateForm from '../app/(main_pages)/generate/GenerateForm'

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                       */
/* -------------------------------------------------------------------------- */

function getGenerateBtn() {
  return screen.getByRole('button', { name: 'generate' })
}

function resetStore(overrides = {}) {
  useStore.setState({
    user: { id: 'user_123', is_guest: false },
    generateFormValues: {
      website: '',
      prompt: 'a random prompt',
      style_id: 'random',
      style_title: 'Random',
      qr_weight: 0.0,
      negative_prompt: '',
      seed: -1,
    },
    generatingImage: false,
    alert: { open: false, severity: 'info', message: '' },
    ...overrides,
  })
}

/** A resolved progress response that immediately ends the poll loop. */
function succeeded(result) {
  return { status: 'succeeded', percent: 100, stage: 'finishing', eta: null, result }
}

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterAll(() => {
  console.error.mockRestore()
})

beforeEach(() => {
  resetStore()
  mockPush.mockClear()
  mockStartGeneration.mockReset()
  mockGetGenerationProgress.mockReset()
  window.sessionStorage.clear()
  amplitude.track.mockClear()
})

/* -------------------------------------------------------------------------- */
/*                                  TESTS                                      */
/* -------------------------------------------------------------------------- */

describe('GenerateForm', () => {
  // ---- 1. Basic rendering ----
  test('renders website input, prompt input, and generate button', () => {
    render(<GenerateForm />)

    expect(screen.getByRole('textbox', { name: /website/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /prompt/i })).toBeInTheDocument()
    expect(getGenerateBtn()).toBeInTheDocument()
  })

  // ---- 2. Generate button disabled when website is empty ----
  test('generate button is disabled when website is empty', () => {
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

    await waitFor(() => {
      expect(getGenerateBtn()).not.toBeDisabled()
    })
  })

  // ---- 4. Calls startGeneration on click, polls once, then navigates (happy path) ----
  test('calls startGeneration with form values on generate click', async () => {
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-1' })
    mockGetGenerationProgress.mockResolvedValueOnce(succeeded({ _id: 'img_abc' }))

    resetStore({
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 'style-2',
        style_title: 'Anime',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
      },
    })

    render(<GenerateForm />)
    const btn = getGenerateBtn()

    await act(async () => {
      fireEvent.click(btn)
    })

    await waitFor(() => {
      expect(mockStartGeneration).toHaveBeenCalledTimes(1)
    })

    const [formArg] = mockStartGeneration.mock.calls[0]
    expect(formArg.website).toBe('example.com')
    expect(formArg.prompt).toBe('a dragon')

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/images/img_abc?justGenerated=true')
    })
  })

  // ---- 5. Shows generating loader when generatingImage is true ----
  test('shows GeneratingLoader (and hides form) when generatingImage is true', () => {
    resetStore({ generatingImage: true })
    render(<GenerateForm />)

    expect(screen.getByTestId('generating-loader')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /website/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'generate' })).not.toBeInTheDocument()
  })

  // ---- 6. Logged-in users have no client-side credit gate — generation proceeds ----
  test('calls startGeneration even when logged-in user has no credits field', async () => {
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-2' })
    mockGetGenerationProgress.mockResolvedValueOnce(succeeded({ _id: 'img_abc' }))

    resetStore({
      user: { id: 'user_123', is_guest: false },
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 'style-2',
        style_title: 'Anime',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
      },
    })

    render(<GenerateForm />)

    await act(async () => {
      fireEvent.click(getGenerateBtn())
    })

    await waitFor(() => {
      expect(mockStartGeneration).toHaveBeenCalledTimes(1)
    })
  })

  // ---- 7. Shows "Sign in to keep going" dialog when backend rejects with InsufficientCredits error ----
  test('shows "Sign in to keep going" dialog when backend rejects with InsufficientCredits error', async () => {
    mockStartGeneration.mockRejectedValueOnce(new Error('InsufficientCredits'))

    resetStore({
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 'style-2',
        style_title: 'Anime',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
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

  // ---- 8. Progress percent reaches the loader across multiple polls ----
  test('updates the loader percent as progress polls come back, then navigates on success', async () => {
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-3' })
    mockGetGenerationProgress
      .mockResolvedValueOnce({ status: 'processing', percent: 20, stage: 'novita', eta: 5 })
      .mockResolvedValueOnce(succeeded({ _id: 'img_abc' }))

    resetStore({
      generateFormValues: {
        website: 'example.com',
        prompt: 'a dragon',
        style_id: 'style-2',
        style_title: 'Anime',
        qr_weight: 0.0,
        negative_prompt: '',
        seed: -1,
      },
    })

    render(<GenerateForm />)

    await act(async () => {
      fireEvent.click(getGenerateBtn())
    })

    await waitFor(() => {
      expect(screen.getByTestId('generating-loader').dataset.percent).toBe('20')
    })

    // Real ~1.2s poll interval — wait past it so the second (final) poll fires.
    await new Promise((resolve) => setTimeout(resolve, 1300))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/images/img_abc?justGenerated=true')
    })
  }, 10000)

  // ---- 9 & 10. Regeneration props on Generate Image event ----

  function getGenerateImageProps() {
    const call = amplitude.track.mock.calls.find((c) => c[0] === 'Generate Image')
    return call ? call[1] : null
  }

  function fillForm() {
    resetStore({
      generateFormValues: {
        website: 'example.com', prompt: 'a dragon', style_id: 'style-2',
        style_title: 'Anime', qr_weight: 0.0,
        negative_prompt: '', seed: -1,
      },
    })
  }

  test('first generation tags the event as generation_number 1 / is_first_generation true', async () => {
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-4' })
    mockGetGenerationProgress.mockResolvedValueOnce(succeeded({ _id: 'img_abc' }))
    fillForm()
    render(<GenerateForm />)

    await act(async () => { fireEvent.click(getGenerateBtn()) })

    await waitFor(() => expect(getGenerateImageProps()).not.toBeNull())
    expect(getGenerateImageProps().generation_number).toBe(1)
    expect(getGenerateImageProps().is_first_generation).toBe(true)
  })

  test('a repeat generation in the same session increments generation_number', async () => {
    window.sessionStorage.setItem('qrai_generation_count', '1')
    mockStartGeneration.mockResolvedValueOnce({ job_id: 'job-5' })
    mockGetGenerationProgress.mockResolvedValueOnce(succeeded({ _id: 'img_def' }))
    fillForm()
    render(<GenerateForm />)

    await act(async () => { fireEvent.click(getGenerateBtn()) })

    await waitFor(() => expect(getGenerateImageProps()).not.toBeNull())
    expect(getGenerateImageProps().generation_number).toBe(2)
    expect(getGenerateImageProps().is_first_generation).toBe(false)
  })

})
