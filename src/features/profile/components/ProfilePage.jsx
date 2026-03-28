import { useCallback, useEffect, useRef, useState } from 'react'
import ProfileForm from './ProfileForm'
import ProfileHeader from './ProfileHeader'
import Button from '../../../ui/Button'
import ProfileLogoutButton from './ProfileLogoutButton'
import { useAppScreen } from '../../../lib/AppScreenContext'
import { useAuth } from '../../../lib/AuthContext'
import { colors } from '../../../design/colors'
import { isSupabaseConfigured } from '../../../services/supabase.js'
import { getCurrentUser } from '../../../services/auth'
import { checkProfileComplete, getProfile, updateProfile } from '../../../services/profile'
import { logFlow } from '../../../lib/devFlowLog.js'
import ScreenShell from '../../../ui/layout/ScreenShell'
import { SCREEN_SHELL_MAIN_MODE } from '../../../ui/layout/layout'
import Section from '../../../ui/layout/Section'
import ProfileReviewsLayout, {
  profileReviewsShellContentStyle,
} from '../../shared/layout/ProfileReviewsLayout'
import {
  layoutActionsStyle,
  profileActionsFooterStyle,
  profileFormSectionLayoutStyle,
  profileFormVerticalSlotStyle,
  profileReviewsFullWidthButtonStyle,
} from '../../shared/profileReviewsLayout'

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
const PROFILE_DRAFT_KEY = 'waitme.dev.profileDraft'
const PROFILE_PENDING_SYNC_KEY = 'waitme.dev.profilePendingSync'
const AUTOSAVE_DEBOUNCE_MS = 600
const shellStyle = { backgroundColor: colors.background }

function profileFromUser(user) {
  const meta =
    user?.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    ''
  const email = typeof user?.email === 'string' ? user.email : ''
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : ''
  return { name, email, avatarUrl }
}

export default function ProfilePage() {
  const { openHome } = useAppScreen()
  const { user: sessionUser, signOut, markProfileComplete } = useAuth()
  const sessionUserEmail = sessionUser?.email
  const sessionUserMeta = sessionUser?.user_metadata
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [savedProfile, setSavedProfile] = useState(EMPTY_PROFILE)
  const [isSaving, setIsSaving] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState('idle')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const autosaveTimerRef = useRef(null)
  const autosaveInFlightRef = useRef(false)
  const autosavePendingRef = useRef(false)
  const profileRef = useRef(profile)
  const savedProfileRef = useRef(savedProfile)
  const sessionUserIdRef = useRef(sessionUser?.id ?? null)
  const autosaveStatusRef = useRef('idle')

  const fieldErrors = submitAttempted
    ? {
        full_name: String(profile.full_name ?? '').trim() ? '' : 'Indica tu nombre',
        plate:
          String(profile.plate ?? '').replace(/\s/g, '').length >= 4
            ? ''
            : 'Introduce tu matrícula',
        brand: String(profile.brand ?? '').trim() ? '' : 'Indica la marca',
        model: String(profile.model ?? '').trim() ? '' : 'Indica el modelo',
        phone:
          String(profile.phone ?? '').replace(/\s/g, '').length >= 6
            ? ''
            : 'Añade un teléfono válido',
      }
    : {}
  const canContinue =
    String(profile.full_name ?? '').trim().length > 0 &&
    String(profile.plate ?? '').replace(/\s/g, '').length >= 4 &&
    String(profile.brand ?? '').trim().length > 0 &&
    String(profile.model ?? '').trim().length > 0 &&
    String(profile.phone ?? '').replace(/\s/g, '').length >= 6

  useEffect(() => {
    profileRef.current = profile
  }, [profile])
  useEffect(() => {
    savedProfileRef.current = savedProfile
  }, [savedProfile])
  useEffect(() => {
    sessionUserIdRef.current = sessionUser?.id ?? null
  }, [sessionUser?.id])
  useEffect(() => {
    const pending = JSON.stringify(profile) !== JSON.stringify(savedProfile)
    setHasPendingChanges(pending)
  }, [profile, savedProfile])
  useEffect(() => {
    autosaveStatusRef.current = autosaveStatus
  }, [autosaveStatus])

  useEffect(() => {
    if (!sessionUser?.id) {
      void signOut()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (!cancelled) {
            const seed = profileFromUser({
              email: sessionUserEmail,
              user_metadata: sessionUserMeta,
            })
            let draft = null
            try {
              const raw = window.localStorage?.getItem?.(PROFILE_DRAFT_KEY)
              draft = raw ? JSON.parse(raw) : null
            } catch {
              draft = null
            }
            const next = {
              ...(draft && typeof draft === 'object' ? draft : EMPTY_PROFILE),
              full_name: (draft?.full_name || '').trim() ? draft.full_name : seed.name,
              email: (draft?.email || '').trim() ? draft.email : seed.email,
              avatar_url: (draft?.avatar_url || '').trim() ? draft.avatar_url : seed.avatarUrl,
            }
            setProfile(next)
            setSavedProfile(next)
          }
          return
        }
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
          const seed = profileFromUser({ email: sessionUserEmail, user_metadata: sessionUserMeta })
          const merged = {
            ...data,
            full_name: data.full_name || seed.name,
            email: data.email || seed.email,
            avatar_url: data.avatar_url || seed.avatarUrl,
          }
          try {
            const raw = window.localStorage?.getItem?.(PROFILE_DRAFT_KEY)
            const draft = raw ? JSON.parse(raw) : null
            if (draft && typeof draft === 'object') {
              merged.phone = draft.phone || merged.phone
              merged.brand = draft.brand || merged.brand
              merged.model = draft.model || merged.model
              merged.plate = draft.plate || merged.plate
              merged.color = draft.color || merged.color
              merged.vehicle_type = draft.vehicle_type || merged.vehicle_type
            }
          } catch {
            /* */
          }
          setProfile(merged)
          setSavedProfile(merged)
        }
      } catch (e) {
        console.error('[WaitMe][ProfilePage] carga inicial excepción', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionUser?.id, sessionUserEmail, sessionUserMeta, signOut])

  useEffect(() => {
    if (!sessionUser?.id) return
    try {
      window.localStorage?.setItem?.(PROFILE_DRAFT_KEY, JSON.stringify(profile))
    } catch {
      /* */
    }
  }, [profile, sessionUser?.id])

  const runAutosave = useCallback(async () => {
    const currentProfile = profileRef.current
    const currentSaved = savedProfileRef.current
    const userId = sessionUserIdRef.current
    if (!userId) return
    if (JSON.stringify(currentProfile) === JSON.stringify(currentSaved)) {
      setAutosaveStatus('idle')
      return
    }
    if (autosaveInFlightRef.current) {
      autosavePendingRef.current = true
      return
    }
    autosaveInFlightRef.current = true
    setIsSaving(true)
    setAutosaveStatus('saving')
    logFlow('AUTOSAVE_START')
    try {
      try {
        window.localStorage?.setItem?.(PROFILE_DRAFT_KEY, JSON.stringify(currentProfile))
      } catch {
        /* */
      }
      if (!isSupabaseConfigured()) {
        setSavedProfile({ ...currentProfile })
        setAutosaveStatus('idle')
        logFlow('AUTOSAVE_SUCCESS', { mode: 'dev-local' })
      } else {
        const user = await getCurrentUser()
        if (!user?.id) {
          void signOut()
          return
        }
        const { data, error } = await updateProfile(user.id, currentProfile)
        if (error) throw error
        const merged = data
          ? {
              ...data,
              full_name: currentProfile.full_name,
              phone: currentProfile.phone,
              brand: currentProfile.brand,
              model: currentProfile.model,
              plate: currentProfile.plate,
              color: currentProfile.color,
              vehicle_type: currentProfile.vehicle_type,
              allow_phone_calls: currentProfile.allow_phone_calls,
            }
          : { ...currentProfile }
        setProfile(merged)
        setSavedProfile(merged)
        setAutosaveStatus('idle')
        logFlow('AUTOSAVE_SUCCESS', { mode: 'supabase' })
        try {
          window.localStorage?.removeItem?.(PROFILE_PENDING_SYNC_KEY)
        } catch {
          /* */
        }
      }
    } catch (e) {
      setAutosaveStatus('error')
      logFlow('AUTOSAVE_ERROR', { reason: e instanceof Error ? e.message : String(e) })
      try {
        window.localStorage?.setItem?.(PROFILE_PENDING_SYNC_KEY, JSON.stringify(currentProfile))
      } catch {
        /* */
      }
    } finally {
      autosaveInFlightRef.current = false
      setIsSaving(false)
      if (autosavePendingRef.current) {
        autosavePendingRef.current = false
        void runAutosave()
      }
    }
  }, [signOut])

  const flushAutosave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    await runAutosave()
    await new Promise((resolve) => {
      const waitStable = () => {
        if (autosaveInFlightRef.current || autosavePendingRef.current || autosaveTimerRef.current) {
          window.setTimeout(waitStable, 50)
          return
        }
        resolve()
      }
      waitStable()
    })
  }, [runAutosave])

  useEffect(() => {
    if (!sessionUser?.id) return undefined
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    if (JSON.stringify(profile) === JSON.stringify(savedProfile)) return undefined
    setAutosaveStatus('saving')
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null
      void runAutosave()
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [profile, savedProfile, runAutosave, sessionUser?.id])

  useEffect(() => {
    const onOnline = () => {
      let pending = null
      try {
        const raw = window.localStorage?.getItem?.(PROFILE_PENDING_SYNC_KEY)
        pending = raw ? JSON.parse(raw) : null
      } catch {
        pending = null
      }
      if (pending && typeof pending === 'object') {
        setProfile((prev) => ({ ...prev, ...pending }))
        autosavePendingRef.current = true
        void runAutosave()
      }
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [runAutosave])

  useEffect(() => {
    const persistBeforeLeave = () => {
      try {
        window.localStorage?.setItem?.(PROFILE_DRAFT_KEY, JSON.stringify(profileRef.current))
      } catch {
        /* */
      }
      if (autosaveTimerRef.current || autosaveInFlightRef.current || autosavePendingRef.current) {
        autosavePendingRef.current = true
        void runAutosave()
      }
    }
    window.addEventListener('visibilitychange', persistBeforeLeave)
    window.addEventListener('pagehide', persistBeforeLeave)
    return () => {
      window.removeEventListener('visibilitychange', persistBeforeLeave)
      window.removeEventListener('pagehide', persistBeforeLeave)
    }
  }, [runAutosave])

  const handleContinue = useCallback(async () => {
    setSubmitAttempted(true)
    console.info('[WaitMe][Debug] ACTION: SAVE_PROFILE')
    if (!checkProfileComplete(profile)) return
    if (!canContinue) return
    if (hasPendingChanges || isSaving || autosaveStatusRef.current === 'saving') {
      await flushAutosave()
    }
    if (autosaveStatusRef.current === 'error') {
      await flushAutosave()
      if (autosaveStatusRef.current === 'error') return
    }
    const saved = profileRef.current
    if (!checkProfileComplete(saved)) return
    markProfileComplete(saved)
    logFlow('PROFILE_SAVED', { mode: isSupabaseConfigured() ? 'supabase' : 'dev-local' })
    logFlow('NAVIGATE_HOME')
    openHome?.()
  }, [
    profile,
    canContinue,
    hasPendingChanges,
    isSaving,
    flushAutosave,
    markProfileComplete,
    openHome,
  ])

  const handleLogout = useCallback(async () => {
    await signOut()
  }, [signOut])

  return (
    <ScreenShell
      style={shellStyle}
      contentStyle={profileReviewsShellContentStyle}
      mainMode={SCREEN_SHELL_MAIN_MODE.INSET}
      mainOverflow="hidden"
    >
      <ProfileReviewsLayout header={<ProfileHeader profile={profile} />}>
        <div style={profileFormVerticalSlotStyle}>
          <Section style={profileFormSectionLayoutStyle}>
            <ProfileForm value={profile} onChange={setProfile} errors={fieldErrors} />
          </Section>
        </div>
        <div style={profileActionsFooterStyle}>
          <div style={layoutActionsStyle}>
            <Button
              type="button"
              variant="profileSave"
              disabled={!canContinue || isSaving || autosaveStatus === 'saving'}
              onClick={handleContinue}
              style={profileReviewsFullWidthButtonStyle}
            >
              Guardar
            </Button>
            <ProfileLogoutButton
              onLogout={handleLogout}
              style={profileReviewsFullWidthButtonStyle}
            />
          </div>
        </div>
      </ProfileReviewsLayout>
    </ScreenShell>
  )
}
