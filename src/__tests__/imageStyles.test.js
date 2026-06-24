import { styles } from '../_utils/ImageStyles'

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
