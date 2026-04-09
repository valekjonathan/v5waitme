import { beforeEach, vi } from 'vitest'

/** Coherente con motores reales: altura visible para `--app-height`. */
if (typeof window !== 'undefined' && window.visualViewport == null) {
  Object.defineProperty(window, 'visualViewport', {
    value: {
      width: 390,
      height: 844,
      offsetTop: 0,
      offsetLeft: 0,
      scale: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    configurable: true,
    writable: true,
  })
}

/** jsdom no expone ResizeObserver; el shell lo usa para medir header/nav. */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback
    }
    observe(_el) {
      queueMicrotask(() => {
        this.callback([], this)
      })
    }
    unobserve() {}
    disconnect() {}
  }
}

vi.mock('mapbox-gl', () => {
  class MockMap {
    on() {
      return this
    }
    off() {}
    remove() {}
    resize() {}
    easeTo() {}
    addControl() {}
    getCenter() {
      return { lat: 43.3619, lng: -5.8494 }
    }
    isStyleLoaded() {
      return false
    }
  }
  class MockAttributionControl {
    constructor() {}
  }
  return {
    default: {
      accessToken: '',
      Map: MockMap,
      AttributionControl: MockAttributionControl,
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
