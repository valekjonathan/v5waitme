import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import { appReducer, initialAppState } from './appStore.js'

export const AppStateContext = createContext(null)
const AppDispatchContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState)
  const stableDispatch = useCallback((action) => {
    dispatch(action)
  }, [])

  return (
    <AppDispatchContext.Provider value={stableDispatch}>
      <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>
    </AppDispatchContext.Provider>
  )
}

export function useAppDispatch() {
  const d = useContext(AppDispatchContext)
  if (d == null) {
    throw new Error('useAppDispatch must be used within AppProvider')
  }
  return d
}

/**
 * Solo lectura del slice auth en el store (sincronizado por AuthProvider).
 * Para acciones y authError usar useAuth() desde AuthContext.jsx (API unificada).
 */
export function useAuthState() {
  const state = useContext(AppStateContext)
  if (state == null) {
    throw new Error('useAuthState must be used within AppProvider')
  }
  return useMemo(
    () => ({
      user: state.user,
      session: state.session,
      authStatus: state.authStatus,
    }),
    [state.user, state.session, state.authStatus]
  )
}
