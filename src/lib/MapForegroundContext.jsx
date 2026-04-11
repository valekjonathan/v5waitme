import { createContext, useContext } from 'react'

/** `true` cuando la pantalla activa es el mapa (no hay overlay de chats, perfil, etc.). */
const MapForegroundContext = createContext(true)

export function MapForegroundProvider({ value, children }) {
  return <MapForegroundContext.Provider value={value}>{children}</MapForegroundContext.Provider>
}

export function useMapForeground() {
  return useContext(MapForegroundContext)
}
