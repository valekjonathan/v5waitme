/** Pantallas de la shell autenticada (home / perfil / reseñas). */
export const APP_SCREEN_HOME = 'home'
export const APP_SCREEN_PROFILE = 'profile'
export const APP_SCREEN_REVIEWS = 'reviews'

/**
 * Reductor puro para navegación interna (testeable sin React).
 * @param {string} state
 * @param {{ type: 'openProfile' | 'openHome' | 'openReviews' }} action
 */
export function reduceAppScreen(state, action) {
  switch (action.type) {
    case 'openProfile':
      return APP_SCREEN_PROFILE
    case 'openReviews':
      return APP_SCREEN_REVIEWS
    case 'openHome':
      return APP_SCREEN_HOME
    default:
      return state
  }
}
