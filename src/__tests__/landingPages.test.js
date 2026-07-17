import {
  styles,
  isRichLandingPage,
  RANDOM_STYLE_ID,
  styleDisplayName,
} from '../_utils/ImageStyles'
import { STYLE_ICONS } from '../_utils/styleIcons'

const richStyles = () =>
  styles.filter((s) => s.landingPage && isRichLandingPage(s.landingPage))

describe('rich style landing pages — shape invariants', () => {
  test('every rich landingPage has exactly 3 features, each with a resolvable icon and non-empty label', () => {
    for (const s of richStyles()) {
      const lp = s.landingPage
      expect(lp.features).toHaveLength(3)
      for (const f of lp.features) {
        expect(STYLE_ICONS[f.icon]).toBeTruthy()
        expect(typeof f.label).toBe('string')
        expect(f.label.length).toBeGreaterThan(0)
      }
    }
  })

  test('every rich landingPage has at least 3 perfectFor cards, each with a resolvable icon and a product-placements imageUrl', () => {
    for (const s of richStyles()) {
      const lp = s.landingPage
      expect(lp.perfectFor.length).toBeGreaterThanOrEqual(3)
      for (const card of lp.perfectFor) {
        expect(STYLE_ICONS[card.icon]).toBeTruthy()
        expect(typeof card.title).toBe('string')
        expect(card.title.length).toBeGreaterThan(0)
        expect(typeof card.description).toBe('string')
        expect(card.description.length).toBeGreaterThan(0)
        expect(card.imageUrl.startsWith('/product-placements/')).toBe(true)
      }
    }
  })

  test('every rich landingPage has exactly 6 promptIdeas and a non-empty exampleCaption', () => {
    for (const s of richStyles()) {
      const lp = s.landingPage
      expect(lp.promptIdeas).toHaveLength(6)
      expect(typeof lp.exampleCaption).toBe('string')
      expect(lp.exampleCaption.length).toBeGreaterThan(0)
    }
  })

  test('every rich landingPage has a 2-line headingLines array whose second line contains headingAccent', () => {
    for (const s of richStyles()) {
      const lp = s.landingPage
      expect(lp.headingLines).toHaveLength(2)
      expect(lp.headingLines[1]).toContain(lp.headingAccent)
    }
  })

  test('every landingPage slug is unique and follows the "<words>-qr-code" convention', () => {
    const slugs = styles.filter((s) => s.landingPage).map((s) => s.landingPage.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+-qr-code$/)
    }
  })

  test('no landingPage carries the unused examples field', () => {
    for (const s of styles) {
      if (s.landingPage) {
        expect(s.landingPage.examples).toBeUndefined()
      }
    }
  })

  test('every landingPage has a non-empty tagline', () => {
    for (const s of styles) {
      if (s.landingPage) {
        expect(typeof s.landingPage.tagline).toBe('string')
        expect(s.landingPage.tagline.length).toBeGreaterThan(0)
      }
    }
  })

  test('the Ghibli style landing page never mentions "Ghibli" or "Studio Ghibli" in rendered copy (trademark)', () => {
    const ghibli = styles.find((s) => s.title === 'Ghibli')
    const lp = ghibli.landingPage
    const rendered = JSON.stringify([
      lp.badge,
      lp.headingLines,
      lp.intro,
      lp.metaTitle,
      lp.metaDescription,
      lp.exampleCaption,
      lp.features,
      lp.why,
      lp.useCases,
      lp.promptIdeas,
      lp.perfectFor,
      lp.tagline,
    ]).toLowerCase()
    expect(rendered).not.toContain('ghibli')
  })

  test('styleDisplayName is trademark-safe for the Ghibli style (guards template-derived headings/CTAs)', () => {
    // The /styles/[slug] template derives the Examples heading, hero alt text,
    // and bottom CTA from styleDisplayName(style), not the landingPage copy —
    // so the visible title must also be free of "ghibli", even though the
    // internal style.title stays "Ghibli" for the DB/generation pipeline.
    const ghibli = styles.find((s) => s.title === 'Ghibli')
    expect(ghibli.title).toBe('Ghibli') // internal name unchanged
    expect(styleDisplayName(ghibli).toLowerCase()).not.toContain('ghibli')
  })
})

describe('QRAI-138 batch completion', () => {
  test('every non-Random style now has a rich landingPage', () => {
    const nonRandom = styles.filter((s) => s.id !== RANDOM_STYLE_ID)
    expect(nonRandom).toHaveLength(13)
    for (const s of nonRandom) {
      expect(s.landingPage).toBeDefined()
      expect(isRichLandingPage(s.landingPage)).toBe(true)
    }
  })
})
