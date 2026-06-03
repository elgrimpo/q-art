import { calculateCredits } from '../_utils/utils'

// Helper that mirrors the DownloadButton credit formula exactly:
//   download cost  = !image.downloaded ? 10 : 0
//   upscale cost   = newResolution === image.width ? 0 : newResolution
const downloadCost = (image, targetResolution) =>
  calculateCredits({
    download: !image.downloaded,
    upscale: targetResolution === image.width ? 0 : targetResolution,
  })

// --------------------------------------------------------------------------
// CALCULATE CREDITS
// Mirrors the Python calculate_credits() in api/utils/utils.py.
// Both must agree on every price — a mismatch silently over/under-charges users.
// --------------------------------------------------------------------------

describe('calculateCredits', () => {
  describe('generate', () => {
    test('costs 1 credit', () => {
      expect(calculateCredits({ generate: 1 })).toBe(1)
    })
  })

  describe('download', () => {
    test('true costs 10 credits', () => {
      expect(calculateCredits({ download: true })).toBe(10)
    })

    test('false costs 0 credits', () => {
      expect(calculateCredits({ download: false })).toBe(0)
    })
  })

  describe('upscale', () => {
    test('512 costs 10 credits', () => {
      expect(calculateCredits({ upscale: 512 })).toBe(10)
    })

    test('1024 costs 15 credits', () => {
      expect(calculateCredits({ upscale: 1024 })).toBe(15)
    })

    test('2048 costs 20 credits', () => {
      expect(calculateCredits({ upscale: 2048 })).toBe(20)
    })

    test('4096 costs 25 credits', () => {
      expect(calculateCredits({ upscale: 4096 })).toBe(25)
    })

    test('0 costs 0 credits', () => {
      expect(calculateCredits({ upscale: 0 })).toBe(0)
    })
  })

  describe('combined services', () => {
    test('generate + download = 11 credits', () => {
      expect(calculateCredits({ generate: 1, download: true })).toBe(11)
    })

    test('upscale 1024 + download = 25 credits', () => {
      expect(calculateCredits({ upscale: 1024, download: true })).toBe(25)
    })
  })

  describe('parity with Python backend', () => {
    // These cases must match calculate_credits() in api/utils/utils.py exactly.
    test.each([
      [{ generate: 1 }, 1],
      [{ download: true }, 10],
      [{ download: false }, 0],
      [{ upscale: 512 }, 10],
      [{ upscale: 1024 }, 15],
      [{ upscale: 2048 }, 20],
      [{ upscale: 4096 }, 25],
    ])('calculateCredits(%o) === %i', (input, expected) => {
      expect(calculateCredits(input)).toBe(expected)
    })
  })
})

// --------------------------------------------------------------------------
// DOWNLOAD CREDIT CALCULATION  (mirrors DownloadButton.handleResolutionChange)
// --------------------------------------------------------------------------

describe('downloadCost', () => {
  describe('first-time download at same resolution', () => {
    test('costs 10 credits (download fee only)', () => {
      expect(downloadCost({ width: 512, downloaded: false }, 512)).toBe(10)
    })
  })

  describe('already downloaded at same resolution', () => {
    test('costs 0 credits', () => {
      expect(downloadCost({ width: 512, downloaded: true }, 512)).toBe(0)
    })
  })

  describe('upscale + first download', () => {
    test('512→1024 costs 25 credits (15 upscale + 10 download)', () => {
      expect(downloadCost({ width: 512, downloaded: false }, 1024)).toBe(25)
    })

    test('512→2048 costs 30 credits (20 upscale + 10 download)', () => {
      expect(downloadCost({ width: 512, downloaded: false }, 2048)).toBe(30)
    })

    test('512→4096 costs 35 credits (25 upscale + 10 download)', () => {
      expect(downloadCost({ width: 512, downloaded: false }, 4096)).toBe(35)
    })
  })

  describe('upscale only (already downloaded before)', () => {
    test('1024→2048 costs 20 credits (upscale only, no download fee)', () => {
      expect(downloadCost({ width: 1024, downloaded: true }, 2048)).toBe(20)
    })
  })
})
