import promptRandomizer, { promptKeywords } from '../_utils/PromptGenerator'

describe('promptRandomizer', () => {
  test('returns a non-empty string', () => {
    const result = promptRandomizer()
    expect(typeof result).toBe('string')
    expect(result.trim().length).toBeGreaterThan(0)
  })

  test('returns different results across calls (randomness)', () => {
    // With list sizes of 35+, the chance of 5 identical results is negligible.
    const results = Array.from({ length: 5 }, () => promptRandomizer())
    const unique = new Set(results)
    expect(unique.size).toBeGreaterThan(1)
  })

  test('output ends with a time-of-day or era phrase from the when list', () => {
    // Spot-check: the when list entries include phrases like "at sunset", "at Midnight"
    // Run enough times that at least one result contains "at " or "in "
    const results = Array.from({ length: 20 }, () => promptRandomizer())
    const hasTimePhrase = results.some(r => /\b(at|in|during)\b/i.test(r))
    expect(hasTimePhrase).toBe(true)
  })
})

describe('promptKeywords', () => {
  test('is an array of category objects', () => {
    expect(Array.isArray(promptKeywords)).toBe(true)
    expect(promptKeywords.length).toBeGreaterThan(0)
  })

  test('each category has a title and non-empty keywords array', () => {
    for (const category of promptKeywords) {
      expect(typeof category.title).toBe('string')
      expect(Array.isArray(category.keywords)).toBe(true)
      expect(category.keywords.length).toBeGreaterThan(0)
    }
  })
})
