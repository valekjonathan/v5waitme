import { describe, expect, it } from 'vitest'
import { isStandaloneDisplayMode, shouldEnableIphonePreview } from '../../src/ui/IphoneFrame.jsx'

describe('IphoneFrame preview guard', () => {
  it('desactiva ?iphone=true en modo standalone (PWA instalada)', () => {
    expect(shouldEnableIphonePreview('?iphone=true', true)).toBe(false)
    expect(shouldEnableIphonePreview('?iphone=1', true)).toBe(false)
  })

  it('activa preview solo en navegador normal con query explícita', () => {
    expect(shouldEnableIphonePreview('?iphone=true', false)).toBe(true)
    expect(shouldEnableIphonePreview('?iphone=1', false)).toBe(true)
    expect(shouldEnableIphonePreview('?iphone=false', false)).toBe(false)
  })

  it('detecta standalone con matchMedia y con navigator.standalone', () => {
    const withMatchMedia = {
      matchMedia: () => ({ matches: true }),
      navigator: {},
    }
    expect(isStandaloneDisplayMode(withMatchMedia)).toBe(true)

    const withLegacySafari = {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    }
    expect(isStandaloneDisplayMode(withLegacySafari)).toBe(true)
  })
})
