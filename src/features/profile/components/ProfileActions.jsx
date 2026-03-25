import Button from '../../../ui/Button'
import ProfileLogoutButton from './ProfileLogoutButton'

export default function ProfileActions({ hasChanges, onSave, onLogout }) {
  return (
    <>
      <Button type="button" variant="profileSave" disabled={!hasChanges} onClick={onSave}>
        Guardar
      </Button>
      <ProfileLogoutButton onLogout={onLogout} />
    </>
  )
}
