const ALLOWED_EVENTS = new Set([
  'APP_START',
  'LOGIN_CLICK',
  'LOGIN_SUCCESS',
  'PROFILE_REQUIRED',
  'PROFILE_SAVED',
  'NAVIGATE_HOME',
  'AUTOSAVE_START',
  'AUTOSAVE_SUCCESS',
  'AUTOSAVE_ERROR',
])

export function logFlow(event, meta) {
  if (!ALLOWED_EVENTS.has(event)) return
  if (meta == null) {
    console.info(`[WaitMe][Flow] ${event}`)
    return
  }
  console.info(`[WaitMe][Flow] ${event}`, meta)
}
