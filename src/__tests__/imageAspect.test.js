import { getImageAspect, isSquareImage } from '../_utils/imageAspect'

describe('getImageAspect', () => {
  test('square for equal width/height', () => {
    expect(getImageAspect({ width: 768, height: 768 })).toBe('square')
  })

  test('square for missing width/height', () => {
    expect(getImageAspect({})).toBe('square')
  })

  test('landscape for a 3:2 image', () => {
    expect(getImageAspect({ width: 1152, height: 768 })).toBe('landscape')
  })

  test('portrait for a 2:3 image', () => {
    expect(getImageAspect({ width: 768, height: 1152 })).toBe('portrait')
  })

  test('square for ratios within the 0.8-1.2 tolerance band', () => {
    expect(getImageAspect({ width: 900, height: 800 })).toBe('square')
  })
})

describe('isSquareImage', () => {
  test('true for a square image', () => {
    expect(isSquareImage({ width: 768, height: 768 })).toBe(true)
  })

  test('false for a landscape image', () => {
    expect(isSquareImage({ width: 1152, height: 768 })).toBe(false)
  })

  test('false for a portrait image', () => {
    expect(isSquareImage({ width: 768, height: 1152 })).toBe(false)
  })
})
