/**
 * SettingsModal component tests
 *
 * The QR Code Weight slider is presented on a -2..+2 scale (QR_SLIDER_MIN/MAX
 * from _utils/qrWeight.js) and sent to the backend as-is. This test guards
 * the slider's user-facing range.
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
  test('slider exposes the -2..+2 user-facing range', () => {
    render(
      <SettingsModal open handleInputChange={() => {}} handleClose={() => {}} />
    )

    const slider = screen.getByRole('slider', { name: /qr code weight/i })

    expect(slider).toHaveAttribute('aria-valuemin', '-2')
    expect(slider).toHaveAttribute('aria-valuemax', '2')
  })
})
