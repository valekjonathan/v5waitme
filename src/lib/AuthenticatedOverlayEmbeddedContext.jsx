import { createContext, useContext, useMemo } from 'react'

const AuthenticatedOverlayEmbeddedContext = createContext(false)

export function useAuthenticatedOverlayEmbedded() {
  return useContext(AuthenticatedOverlayEmbeddedContext)
}

/** Usado solo en `App.jsx` para marcar el árbol renderizado encima del mapa persistente. */
export function AuthenticatedOverlayEmbeddedProvider({ children }) {
  return (
    <AuthenticatedOverlayEmbeddedContext.Provider value={true}>
      {children}
    </AuthenticatedOverlayEmbeddedContext.Provider>
  )
}

/**
 * Réplica del slot `data-waitme-content-slot` de `ScreenShell` (modo inset), para no anidar otro shell.
 */
export function EmbeddedShellContent({ contentStyle = {}, mainOverflow = 'hidden', children }) {
  const slotStyle = useMemo(
    () => ({
      height: '100%',
      minHeight: 0,
      width: '100%',
      maxWidth: 'none',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: mainOverflow,
      WebkitOverflowScrolling: mainOverflow === 'auto' ? 'touch' : undefined,
      ...contentStyle,
    }),
    [contentStyle, mainOverflow]
  )
  return (
    <div data-waitme-content-slot data-waitme-embedded-shell-content style={slotStyle}>
      {children}
    </div>
  )
}
