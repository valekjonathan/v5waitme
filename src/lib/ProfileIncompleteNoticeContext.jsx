import { createContext, useContext } from 'react'

/** Aviso global: perfil incompleto (acciones bloqueadas). Sin eventos de ventana. */
const ProfileIncompleteNoticeContext = createContext(null)

export function ProfileIncompleteNoticeProvider({ value, children }) {
  return (
    <ProfileIncompleteNoticeContext.Provider value={value}>
      {children}
    </ProfileIncompleteNoticeContext.Provider>
  )
}

export function useProfileIncompleteNotice() {
  return useContext(ProfileIncompleteNoticeContext)
}
