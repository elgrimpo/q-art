import { styles, selectRandomStyle, RANDOM_STYLE_ID } from '../_utils/ImageStyles'

describe('ImageStyles frontend shape', () => {
  test('every style has id, title, and image_url only', () => {
    for (const s of styles) {
      expect(typeof s.id).toBe('string')
      expect(typeof s.title).toBe('string')
      expect(typeof s.image_url).toBe('string')
      expect(s.image_url.length).toBeGreaterThan(0)
    }
  })

  test('no style carries the removed keywords field', () => {
    for (const s of styles) {
      expect(s.keywords).toBeUndefined()
    }
  })

  test('no style carries prompt/loras/sd_model — those live in the DB now', () => {
    for (const s of styles) {
      expect(s.prompt).toBeUndefined()
      expect(s.loras).toBeUndefined()
      expect(s.sd_model).toBeUndefined()
      expect(s.style_modifier).toBeUndefined()
    }
  })

  test('ids are unique', () => {
    const ids = styles.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('the Random entry uses the RANDOM_STYLE_ID sentinel', () => {
    const random = styles.find((s) => s.title === 'Random')
    expect(random.id).toBe(RANDOM_STYLE_ID)
  })
})

describe('selectRandomStyle', () => {
  test('returns a style that is not the Random sentinel', () => {
    const result = selectRandomStyle()
    expect(result.id).not.toBe(RANDOM_STYLE_ID)
    expect(result.title).not.toBe('Random')
  })

  test('always picks from the styles array', () => {
    const result = selectRandomStyle()
    expect(styles).toContainEqual(result)
  })
})
