import { useNativeDebugMount } from '../../../debug/nativeRuntimeDebugMounts.js'
import { useAppScreen } from '../../../lib/AppScreenContext'
import Button from '../../../ui/Button'
import MagnifierIcon from '../../../ui/icons/MagnifierIcon'
import CarIconHome from '../../../ui/icons/CarIconHome'

/** CTAs de inicio; el chrome (hero, velo) lo monta `AuthenticatedMapScreen` o `MainLayout` (login). */
export default function HomePage() {
  useNativeDebugMount('HomePage')
  const { openSearchParking, openParkHere } = useAppScreen()

  return (
    <>
      <Button
        type="button"
        variant="primary"
        data-waitme-home-search-parking=""
        onClick={() => openSearchParking?.()}
      >
        <MagnifierIcon />
        ¿Dónde quieres aparcar?
      </Button>
      <Button
        type="button"
        variant="secondary"
        data-waitme-home-park-here=""
        onClick={() => openParkHere?.()}
      >
        <CarIconHome />
        ¡Estoy aparcado aquí!
      </Button>
    </>
  )
}
