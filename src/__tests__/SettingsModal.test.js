/**
 * SettingsModal component tests
 *
 * The QR Code Weight slider is presented on a -3..+3 scale. That UI value is
 * translated to the backend's [0, 1] qr_weight range before sending (see
 * sliderToQrWeight in _utils/qrWeight.js and the qrWeight.test.js contract
 * test). This test just guards the slider's user-facing range.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

import { useStore } from '../store'
import SettingsModal from '../app/(main_pages)/generate/(formComponents)/SettingsModal'

function resetStore(qrWeight = 0.0) {
  useStore.setState({
    generateFormValues: {
      website: '',
      prompt: '',
      style_id: 1,
      style_title: 'Random',
      style_prompt: '',
      qr_weight: qrWeight,
      negative_prompt: '',
      seed: -1,
      sd_model: 'cyberrealistic_v40_151857.safetensors',
    },
  })
}

beforeEach(() => {
  resetStore()
})

describe('SettingsModal — QR Code Weight slider', () => {
  test('slider exposes the -3..+3 user-facing range', () => {
    render(
      <SettingsModal open handleInputChange={() => {}} handleClose={() => {}} />
    )

    const slider = screen.getByRole('slider', { name: /qr code weight/i })

    expect(slider).toHaveAttribute('aria-valuemin', '-3')
    expect(slider).toHaveAttribute('aria-valuemax', '3')
  })
})
