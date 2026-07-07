import { isHeroTile, itemLayout } from '../app/(main_pages)/explore/gridLayout'

describe('isHeroTile', () => {
  test('true for an is_hero image past index 0', () => {
    expect(isHeroTile({ is_hero: true }, 3)).toBe(true)
  })

  test('false at index 0 even when is_hero is true', () => {
    expect(isHeroTile({ is_hero: true }, 0)).toBe(false)
  })

  test('false when is_hero is not set', () => {
    expect(isHeroTile({}, 3)).toBe(false)
  })
})

describe('itemLayout', () => {
  test('hero tile spans 2 columns and 2 rows as a square', () => {
    const layout = itemLayout({ is_hero: true, width: 768, height: 768 }, 5)
    expect(layout).toEqual({ gridColumn: 'span 2', gridRow: 'span 2', aspectRatio: '1 / 1' })
  })

  test('square image is 1x1', () => {
    const layout = itemLayout({ width: 768, height: 768 }, 2)
    expect(layout).toEqual({ gridColumn: 'span 1', aspectRatio: '1 / 1' })
  })

  test('landscape image spans 2 columns at its real ratio', () => {
    const layout = itemLayout({ width: 1152, height: 768 }, 2)
    expect(layout).toEqual({ gridColumn: 'span 2', aspectRatio: '1152 / 768' })
  })

  test('portrait image spans 2 rows at its real ratio', () => {
    const layout = itemLayout({ width: 768, height: 1152 }, 2)
    expect(layout).toEqual({ gridColumn: 'span 1', gridRow: 'span 2', aspectRatio: '768 / 1152' })
  })

  test('is_hero image at index 0 renders as a normal square tile, not a hero', () => {
    const layout = itemLayout({ is_hero: true, width: 768, height: 768 }, 0)
    expect(layout).toEqual({ gridColumn: 'span 1', aspectRatio: '1 / 1' })
  })

  test('missing width/height falls back to a square tile', () => {
    const layout = itemLayout({}, 2)
    expect(layout).toEqual({ gridColumn: 'span 1', aspectRatio: '1 / 1' })
  })
})
