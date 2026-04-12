import MainLayout from '../../shared/components/MainLayout'
import Button from '../../../ui/Button'
import MagnifierIcon from '../../../ui/icons/MagnifierIcon'
import CarIconHome from '../../../ui/icons/CarIconHome'

export default function HomePage() {
  return (
    <MainLayout>
      <Button type="button" variant="primary">
        <MagnifierIcon />
        ¿Dónde quieres aparcar?
      </Button>
      <Button type="button" variant="secondary">
        <CarIconHome />
        ¡Estoy aparcado aquí!
      </Button>
    </MainLayout>
  )
}
