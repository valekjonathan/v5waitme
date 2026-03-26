import { beforeEach, vi } from 'vitest'

vi.mock('@posthog/react', () => ({
  PostHogProvider: ({ children }) => children,
  usePostHog: () => ({ capture: vi.fn() }),
}))

vi.mock('mapbox-gl', () => {
  class MockMap {
    on() {
      return this
    }
    off() {}
    remove() {}
    resize() {}
    easeTo() {}
    getCenter() {
      return { lat: 43.3619, lng: -5.8494 }
    }
    isStyleLoaded() {
      return false
    }
  }
  return {
    default: {
      accessToken: '',
      Map: MockMap,
    },
  }
})

beforeEach(() => {
  const store = {}
  const ls = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: ls,
    configurable: true,
    writable: true,
  })

  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: {
      getCurrentPosition: (success) => {
        success({ coords: { latitude: 43.3619, longitude: -5.8494, accuracy: 25 } })
      },
      watchPosition: (success) => {
        success({ coords: { latitude: 43.3619, longitude: -5.8494, accuracy: 25 } })
        return 1
      },
      clearWatch: () => {},
    },
    configurable: true,
    writable: true,
  })
})
