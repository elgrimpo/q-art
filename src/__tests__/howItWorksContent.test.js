import { ICONS, heroSteps, steps, tips } from '../app/(marketing)/how-it-works/content'

test('heroSteps has exactly 4 labels', () => {
  expect(heroSteps).toEqual(['Describe', 'Generate', 'Refine', 'Unlock'])
})

function expectValidChecklist(checklist) {
  expect(checklist.length).toBeGreaterThan(0)
  for (const item of checklist) {
    expect(ICONS[item.icon]).toBeTruthy()
    expect(item.label.length).toBeGreaterThan(0)
  }
}

test('every step has a resolvable image and non-empty title/description', () => {
  expect(steps).toHaveLength(4)
  for (const step of steps) {
    expect(typeof step.number).toBe('string')
    expect(step.title.length).toBeGreaterThan(0)
    expect(step.description.length).toBeGreaterThan(0)
    expect(step.image.startsWith('/how-it-works/') || step.image.startsWith('https://')).toBe(true)
    expect(step.imageWidth).toBeGreaterThan(0)
    expect(step.imageHeight).toBeGreaterThan(0)
    expect(step.imageAlt.length).toBeGreaterThan(0)
  }
})

test('steps without subsections have a checklist with resolvable icons', () => {
  for (const step of steps.filter((s) => !s.subsections)) {
    expectValidChecklist(step.checklist)
  }
})

test('step 3 has exactly 2 subsections (Create Variant, Iterate), each with a resolvable checklist', () => {
  const step3 = steps.find((s) => s.number === '3')
  expect(step3.subsections).toHaveLength(2)
  expect(step3.subsections.map((s) => s.title)).toEqual(['Create Variant', 'Iterate'])
  for (const sub of step3.subsections) {
    expect(sub.description.length).toBeGreaterThan(0)
    expectValidChecklist(sub.checklist)
  }
})

test('steps are numbered 1 through 4 in order', () => {
  expect(steps.map((s) => s.number)).toEqual(['1', '2', '3', '4'])
})

test('tips has exactly 2 entries, each with a title and body', () => {
  expect(tips).toHaveLength(2)
  for (const tip of tips) {
    expect(tip.title.length).toBeGreaterThan(0)
    expect(tip.body.length).toBeGreaterThan(0)
  }
})
