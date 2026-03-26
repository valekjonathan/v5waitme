/** Pantallas de la shell autenticada (home / perfil). */
export const APP_SCREEN_HOME = 'home'
export const APP_SCREEN_PROFILE = 'profile'

/**
 * Reductor puro para navegación interna (testeable sin React).
 * @param {string} state
 * @param {{ type: 'openProfile' | 'openHome' }} action
 */
export function reduceAppScreen(state, action) {
  switch (action.type) {
    case 'openProfile':
      return APP_SCREEN_PROFILE
    case 'openHome':
      return APP_SCREEN_HOME
    default:
      return state
  }
}
