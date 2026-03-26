/**
 * Estado global de aplicación (auth reflejada, UI, errores).
 * La fuente de transiciones de auth la orquesta AuthProvider vía dispatch AUTH_SYNC.
 */

export const initialAppState = {
  user: null,
  session: null,
  authStatus: 'loading',
  globalLoading: false,
  globalErrors: [],
  /** `false` hasta que tras login termine ensureProfile (Supabase). */
  profileBootstrapReady: false,
  isNewUser: false,
  isProfileComplete: false,
}

function nextErrorId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'app/AUTH_SYNC': {
      const nextAuthed =
        action.payload.authStatus === 'authenticated' && Boolean(action.payload.user)
      const nextUserId = action.payload.user?.id ?? null
      const sameSessionUser =
        nextAuthed &&
        state.authStatus === 'authenticated' &&
        state.user?.id != null &&
        state.user.id === nextUserId
      return {
        ...state,
        user: action.payload.user ?? null,
        session: action.payload.session ?? null,
        authStatus: action.payload.authStatus,
        ...(nextAuthed
          ? sameSessionUser
            ? {}
            : { profileBootstrapReady: false }
          : {
              profileBootstrapReady: true,
              isNewUser: false,
              isProfileComplete: false,
            }),
      }
    }
    case 'app/PROFILE_BOOTSTRAP':
      return {
        ...state,
        isNewUser: Boolean(action.payload.isNewUser),
        isProfileComplete: Boolean(action.payload.isProfileComplete),
        profileBootstrapReady: true,
      }
    case 'app/PROFILE_MARK_COMPLETE':
      return {
        ...state,
        isProfileComplete: true,
        isNewUser: false,
      }
    case 'app/GLOBAL_LOADING':
      return { ...state, globalLoading: Boolean(action.payload) }
    case 'app/PUSH_ERROR': {
      const { message, meta } = action.payload
      return {
        ...state,
        globalErrors: [
          ...state.globalErrors,
          { id: nextErrorId(), message: String(message ?? 'Error'), meta: meta ?? null },
        ],
      }
    }
    case 'app/CLEAR_ERRORS':
      return { ...state, globalErrors: [] }
    case 'app/DISMISS_ERROR':
      return {
        ...state,
        globalErrors: state.globalErrors.filter((e) => e.id !== action.payload),
      }
    case 'app/AUTH_BOOT_TIMEOUT':
      if (state.authStatus !== 'loading') return state
      return {
        ...state,
        user: null,
        session: null,
        authStatus: 'unauthenticated',
        profileBootstrapReady: true,
        isNewUser: false,
        isProfileComplete: false,
      }
    default:
      return state
  }
}
