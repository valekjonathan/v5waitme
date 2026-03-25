export const EVENTS = {
  // Home
  HOME_VIEW: 'home_view',
  SEARCH_CLICK: 'search_parking_click',
  PARK_CLICK: 'park_here_click',
  USER_ENGAGED: 'user_engaged',

  // Map
  MAP_LOADED: 'map_loaded',
  MAP_INTERACTION: 'map_interaction',

  // Profile
  PROFILE_VIEW: 'profile_view',
  PROFILE_SAVED: 'profile_saved',
}

function waitForPosthog(instance, retries = 10, delay = 200) {
  return new Promise((resolve) => {
    let attempts = 0

    const check = () => {
      if (instance && typeof instance.capture === 'function') {
        return resolve(instance)
      }

      attempts++
      if (attempts >= retries) {
        return resolve(null)
      }

      setTimeout(check, delay)
    }

    check()
  })
}

export async function track(event, data = {}, posthogInstance = null) {
  const ph = await waitForPosthog(posthogInstance)

  if (!ph) {
    console.warn('[Tracking] PostHog no listo:', event)
    return
  }

  try {
    ph.capture(event, data)
    console.log('[Tracking OK]', event, data)
  } catch (e) {
    console.error('[Tracking ERROR]', e)
  }
}
