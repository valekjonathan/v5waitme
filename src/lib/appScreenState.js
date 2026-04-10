/** Pantalla activa única (AppScreenContext). Mapa unifica home / búsqueda / aparcado. */
export const ACTIVE_SCREEN_MAP = 'map'
export const ACTIVE_SCREEN_ALERTS = 'alerts'
export const ACTIVE_SCREEN_CHATS = 'chats'
export const ACTIVE_SCREEN_PROFILE = 'profile'
export const ACTIVE_SCREEN_REVIEWS = 'reviews'
export const ACTIVE_SCREEN_THREAD = 'thread'
export const ACTIVE_SCREEN_RESERVATIONS = 'reservations'

/** @typedef {'home' | 'search' | 'parkHere'} MapMode */

/** Compat: nombres antiguos → nuevos valores de pantalla. */
export const APP_SCREEN_HOME = ACTIVE_SCREEN_MAP
export const APP_SCREEN_SEARCH_PARKING = ACTIVE_SCREEN_MAP
export const APP_SCREEN_PARK_HERE = ACTIVE_SCREEN_MAP
export const APP_SCREEN_ALERTS = ACTIVE_SCREEN_ALERTS
export const APP_SCREEN_CHATS = ACTIVE_SCREEN_CHATS
export const APP_SCREEN_PROFILE = ACTIVE_SCREEN_PROFILE
export const APP_SCREEN_REVIEWS = ACTIVE_SCREEN_REVIEWS
export const APP_SCREEN_USER_REVIEWS = ACTIVE_SCREEN_REVIEWS
export const APP_SCREEN_RESERVATIONS = ACTIVE_SCREEN_RESERVATIONS

/**
 * Reductor puro (tests). El runtime usa setters en AppScreenContext con reglas de limpieza.
 * @param {string} state
 * @param {{ type: string }} action
 */
export function reduceAppScreen(state, action) {
  switch (action.type) {
    case 'openProfile':
      return ACTIVE_SCREEN_PROFILE
    case 'openReviews':
      return ACTIVE_SCREEN_REVIEWS
    case 'openHome':
    case 'openSearchParking':
    case 'openParkHere':
      return ACTIVE_SCREEN_MAP
    case 'openAlerts':
      return ACTIVE_SCREEN_ALERTS
    case 'openReservations':
      return ACTIVE_SCREEN_RESERVATIONS
    case 'openChats':
      return ACTIVE_SCREEN_CHATS
    case 'openUserReviews':
      return ACTIVE_SCREEN_REVIEWS
    case 'openThread':
      return ACTIVE_SCREEN_THREAD
    default:
      return state
  }
}
