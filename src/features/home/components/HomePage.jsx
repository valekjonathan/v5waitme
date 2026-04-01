import MainLayout from '../../shared/components/MainLayout'
import { useAppScreen } from '../../../lib/AppScreenContext'
import Button from '../../../ui/Button'
import MagnifierIcon from '../../../ui/icons/MagnifierIcon'
import CarIconHome from '../../../ui/icons/CarIconHome'

export default function HomePage() {
  const { openSearchParking, openParkHere } = useAppScreen()

  return (
    <MainLayout>
      <Button type="button" variant="primary" onClick={() => openSearchParking?.()}>
        <MagnifierIcon />
        ¿Dónde quieres aparcar?
      </Button>
      <Button type="button" variant="secondary" onClick={() => openParkHere?.()}>
        <CarIconHome />
        ¡Estoy aparcado aquí!
      </Button>
    </MainLayout>
  )
}
