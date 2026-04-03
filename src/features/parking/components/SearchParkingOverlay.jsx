import SearchParkingOverlayImpl from '../waitme/SearchParkingOverlayImpl.jsx'

/**
 * Overlay mapa búsqueda / aparcado — misma cromática; `mode` solo cambia la tarjeta inferior.
 * @param {{ mode?: 'search' | 'parked', allUsers?: object[] }} props
 */
export default function SearchParkingOverlay({ mode = 'search', allUsers }) {
  return <SearchParkingOverlayImpl mode={mode} allUsers={allUsers} />
}
