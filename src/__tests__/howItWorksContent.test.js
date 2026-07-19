import { ICONS, heroSteps, steps, tips } from '../app/(marketing)/how-it-works/content'

test('heroSteps has exactly 4 labels', () => {
  expect(heroSteps).toEqual(['Describe', 'Generate', 'Refine', 'Unlock'])
})

test('every step has a resolvable image, non-empty title/description, and a checklist with resolvable icons', () => {
  expect(steps).toHaveLength(3)
  for (const step of steps) {
    expect(typeof step.number).toBe('string')
    expect(step.title.length).toBeGreaterThan(0)
    expect(step.description.length).toBeGreaterThan(0)
    expect(step.image.startsWith('/how-it-works/')).toBe(true)
    expect(step.imageWidth).toBeGreaterThan(0)
    expect(step.imageHeight).toBeGreaterThan(0)
    expect(step.imageAlt.length).toBeGreaterThan(0)
    expect(step.checklist.length).toBeGreaterThan(0)
    for (const item of step.checklist) {
      expect(ICONS[item.icon]).toBeTruthy()
      expect(item.label.length).toBeGreaterThan(0)
    }
  }
})

test('steps are numbered 1 through 3 in order', () => {
  expect(steps.map((s) => s.number)).toEqual(['1', '2', '3'])
})

test('tips has exactly 2 entries, each with a title and body', () => {
  expect(tips).toHaveLength(2)
  for (const tip of tips) {
    expect(tip.title.length).toBeGreaterThan(0)
    expect(tip.body.length).toBeGreaterThan(0)
  }
})
