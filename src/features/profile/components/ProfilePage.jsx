import { usePostHog } from '@posthog/react'
import { useCallback, useEffect, useState } from 'react'
import ProfileHeader from './ProfileHeader'
import ProfileForm from './ProfileForm'
import ProfileActions from './ProfileActions'
import Plate from './Plate'
import { VehicleIcon } from './VehicleIcons'
import { useAppScreen } from '../../../lib/AppScreenContext'
import { useAuth } from '../../../lib/AuthContext'
import { useAppDispatch } from '../../../store/AppProvider.jsx'
import { colors } from '../../../design/colors'
import { spacing } from '../../../design/spacing'
import { getCurrentUser } from '../../../services/auth'
import { getProfile, isAppProfileComplete, updateProfile } from '../../../services/profile'
import { EVENTS, track } from '../../../lib/tracking.js'

const EMPTY_PROFILE = {
  full_name: '',
  phone: '',
  brand: '',
  model: '',
  plate: '',
  allow_phone_calls: false,
  color: 'negro',
  vehicle_type: 'car',
  email: '',
  avatar_url: '',
}

export default function ProfilePage() {
  const posthog = usePostHog()
  const dispatchStore = useAppDispatch()
  const { openHome } = useAppScreen()
  const { user: sessionUser, signOut } = useAuth()
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [savedProfile, setSavedProfile] = useState(EMPTY_PROFILE)

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile)

  useEffect(() => {
    track(EVENTS.PROFILE_VIEW, { screen: 'profile' }, posthog)
  }, [posthog])

  useEffect(() => {
    if (!sessionUser?.id) {
      void signOut()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const user = await getCurrentUser()
        if (cancelled) return
        if (!user?.id) {
          void signOut()
          return
        }

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
  }, [sessionUser?.id, signOut])

  const handleSave = useCallback(async () => {
    try {
      if (!isAppProfileComplete(profile)) {
        window.alert(
          'Faltan datos obligatorios: teléfono, marca, modelo y matrícula (mín. 4 caracteres).'
        )
        return
      }
      const user = await getCurrentUser()
      if (!user?.id) {
        void signOut()
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
      dispatchStore({ type: 'app/PROFILE_MARK_COMPLETE' })
      openHome?.()
      track(EVENTS.PROFILE_SAVED, { screen: 'profile' }, posthog)
    } catch (e) {
      console.error('[WaitMe][ProfilePage] handleSave excepción', e)
    }
  }, [profile, posthog, signOut, dispatchStore, openHome])

  const handleLogout = useCallback(async () => {
    await signOut()
  }, [signOut])

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
            <div
              style={{
                width: '100%',
                maxWidth: 448,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <ProfileHeader profile={profile} Plate={Plate} VehicleIcon={VehicleIcon} />
              <div style={{ marginTop: spacing.lg }}>
                <ProfileForm
                  value={profile}
                  onChange={setProfile}
                  Plate={Plate}
                  VehicleIcon={VehicleIcon}
                />
              </div>
              <ProfileActions hasChanges={hasChanges} onSave={handleSave} onLogout={handleLogout} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
