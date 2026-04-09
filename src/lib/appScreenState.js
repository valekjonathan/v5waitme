/** Estados lógicos de pantalla (AppScreenContext + reduceAppScreen). */
export const APP_SCREEN_HOME = 'home'
export const APP_SCREEN_PROFILE = 'profile'
export const APP_SCREEN_REVIEWS = 'reviews'
export const APP_SCREEN_SEARCH_PARKING = 'searchParking'
export const APP_SCREEN_PARK_HERE = 'parkHere'
export const APP_SCREEN_ALERTS = 'alerts'
export const APP_SCREEN_CHATS = 'chats'
export const APP_SCREEN_USER_REVIEWS = 'userReviews'

/**
 * Reductor puro para navegación interna (testeable sin React).
 * @param {string} state
 * @param {{ type: string }} action
 */
export function reduceAppScreen(state, action) {
  switch (action.type) {
    case 'openProfile':
      return APP_SCREEN_PROFILE
    case 'openReviews':
      return APP_SCREEN_REVIEWS
    case 'openHome':
      return APP_SCREEN_HOME
    case 'openSearchParking':
      return APP_SCREEN_SEARCH_PARKING
    case 'openParkHere':
      return APP_SCREEN_PARK_HERE
    case 'openAlerts':
      return APP_SCREEN_ALERTS
    case 'openChats':
      return APP_SCREEN_CHATS
    case 'openUserReviews':
      return APP_SCREEN_USER_REVIEWS
    default:
      return state
  }
}
