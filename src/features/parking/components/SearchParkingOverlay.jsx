import SearchParkingOverlayImpl from '../waitme/SearchParkingOverlayImpl.jsx'

/**
 * Overlay búsqueda parking — misma estructura que WaitMe SearchMapOverlay (vía waitme/).
 * @param {{ highlightUser?: object, allUsers?: object[] }} props
 */
export default function SearchParkingOverlay({ highlightUser, allUsers }) {
  return <SearchParkingOverlayImpl highlightUser={highlightUser} allUsers={allUsers} />
}
