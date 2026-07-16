import { STYLE_ICONS } from '../_utils/styleIcons'

describe('STYLE_ICONS', () => {
  test('exports a truthy icon component for every icon key the existing Watercolor landingPage depends on', () => {
    const usedByWatercolor = [
      'BrushOutlined',
      'QrCode2Outlined',
      'LocalPrintshopOutlined',
      'FavoriteBorderOutlined',
      'LocalCafeOutlined',
      'CelebrationOutlined',
      'Inventory2Outlined',
      'ShareOutlined',
    ]
    for (const key of usedByWatercolor) {
      expect(STYLE_ICONS[key]).toBeTruthy()
    }
  })
})
