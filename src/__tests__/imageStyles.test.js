import { styles, selectRandomStyle } from '../_utils/ImageStyles'

describe('ImageStyles LoRA structure', () => {
  test('no style embeds a <lora:> tag in its prompt', () => {
    for (const s of styles) {
      expect(s.prompt).not.toMatch(/<lora:/i)
    }
  })

  test('every style has a loras array', () => {
    for (const s of styles) {
      expect(Array.isArray(s.loras)).toBe(true)
    }
  })

  test('each lora entry has a non-empty model_name string and numeric strength', () => {
    for (const s of styles) {
      for (const l of s.loras) {
        expect(typeof l.model_name).toBe('string')
        expect(l.model_name.length).toBeGreaterThan(0)
        expect(typeof l.strength).toBe('number')
      }
    }
  })

  test('the 8 known lora-bearing styles still carry their loras', () => {
    const byTitle = Object.fromEntries(styles.map((s) => [s.title, s]))
    expect(byTitle['Dreamy'].loras).toEqual([{ model_name: 'LAS_17554', strength: 0.7 }])
    expect(byTitle['Chinese art'].loras).toEqual([
      { model_name: 'wuxia2_62008', strength: 0.8 },
      { model_name: 'MoXinV1_12781', strength: 0.4 },
    ])
  })
})

describe('selectRandomStyle', () => {
  test('returns a style object that is not Random', () => {
    const result = selectRandomStyle()
    expect(result.id).not.toBe(1)
    expect(result.title).not.toBe('Random')
  })

  test('returned style has all required generate fields', () => {
    const result = selectRandomStyle()
    expect(typeof result.id).toBe('number')
    expect(typeof result.title).toBe('string')
    expect(typeof result.prompt).toBe('string')
    expect(Array.isArray(result.loras)).toBe(true)
    expect(typeof result.sd_model).toBe('string')
  })

  test('always picks from the styles array', () => {
    const result = selectRandomStyle()
    expect(styles).toContainEqual(result)
  })
})
