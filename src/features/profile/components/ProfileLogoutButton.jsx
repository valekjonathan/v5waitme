import Button from '../../../ui/Button'
import LogoutIcon from '../../../ui/icons/LogoutIcon'

export default function ProfileLogoutButton({ onLogout }) {
  return (
    <Button type="button" variant="danger" onClick={onLogout}>
      <span style={{ marginRight: 8, lineHeight: 0 }} aria-hidden>
        <LogoutIcon />
      </span>
      Cerrar sesión
    </Button>
  )
}
