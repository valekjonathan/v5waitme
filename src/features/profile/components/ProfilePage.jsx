import { useCallback, useEffect, useState } from 'react'
import Header from '../../../ui/Header'
import BottomNav from '../../../ui/BottomNav'
import ProfileHeader from './ProfileHeader'
import ProfileForm from './ProfileForm'
import ProfileActions from './ProfileActions'
import Plate from './Plate'
import { VehicleIcon } from './VehicleIcons'
import { useAppScreen } from '../../../lib/AppScreenContext'
import { colors } from '../../../design/colors'
import { spacing } from '../../../design/spacing'
import { ensureAuthenticatedUser } from '../../../services/auth'
import { getProfile, updateProfile } from '../../../services/profile'

const EMPTY_PROFILE = {
  full_name: 'JONATHAN',
  phone: '+34 600 00 00',
  brand: 'Porsche',
  model: 'Macan',
  plate: '2026VSR',
  allow_phone_calls: false,
  color: 'negro',
  vehicle_type: 'car',
}

export default function ProfilePage() {
  const nav = useAppScreen()
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [savedProfile, setSavedProfile] = useState(EMPTY_PROFILE)

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { user, error: authErr } = await ensureAuthenticatedUser()
        if (cancelled) return
        if (authErr) {
          console.error('[WaitMe][ProfilePage] auth al cargar', authErr)
          return
        }
        if (!user?.id) return

        const { data, error } = await getProfile(user.id)
        if (cancelled) return
        if (error) return
        if (data) {
          setProfile(data)
          setSavedProfile(data)
        }
      } catch (e) {
        console.error('[WaitMe][ProfilePage] carga inicial excepción', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = useCallback(async () => {
    try {
      const { user, error: authErr } = await ensureAuthenticatedUser()
      if (!user) {
        if (authErr) console.error('[WaitMe][ProfilePage] auth al guardar', authErr)
        return
      }
      const { data, error } = await updateProfile(user.id, profile)
      if (error) {
        console.error('[WaitMe][ProfilePage] guardar falló', error)
        return
      }
      const merged = data
        ? { ...data, allow_phone_calls: profile.allow_phone_calls }
        : { ...profile }
      setProfile(merged)
      setSavedProfile(merged)
    } catch (e) {
      console.error('[WaitMe][ProfilePage] handleSave excepción', e)
    }
  }, [profile])

  const handleLogout = useCallback(() => {
    nav?.openHome?.()
  }, [nav])

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: colors.background,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header />
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: spacing.lg,
            paddingRight: spacing.lg,
            paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))',
            paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
            overflowX: 'hidden',
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <ProfileHeader profile={profile} Plate={Plate} VehicleIcon={VehicleIcon} />
              <div style={{ marginTop: spacing.lg }}>
                <ProfileForm value={profile} onChange={setProfile} Plate={Plate} VehicleIcon={VehicleIcon} />
              </div>
              <ProfileActions hasChanges={hasChanges} onSave={handleSave} onLogout={handleLogout} />
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
