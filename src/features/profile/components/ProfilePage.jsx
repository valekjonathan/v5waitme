import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProfileForm from './ProfileForm'
import ProfileHeader from './ProfileHeader'
import Button from '../../../ui/Button'
import ProfileLogoutButton from './ProfileLogoutButton'
import { useAppScreen } from '../../../lib/AppScreenContext'
import { useAuth } from '../../../lib/AuthContext'
import { colors } from '../../../design/colors'
import { isSupabaseConfigured } from '../../../services/supabase.js'
import { getCurrentUser } from '../../../services/auth'
import {
  checkProfileComplete,
  EMPTY_APP_PROFILE,
  getProfile,
  seedProfileStateFromSession,
  updateProfile,
} from '../../../services/profile'
import { getReviewsForScreen } from '../../../services/reviews'
import { getAverage } from '../../../lib/reviewsModel'
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
  profileFormVerticalSlotStyleNoScroll,
  profileReviewsFullWidthButtonStyle,
  profileScreenAvatarBorder,
} from '../../shared/profileReviewsLayout'

const PROFILE_DRAFT_KEY = 'waitme.dev.profileDraft'
const PROFILE_PENDING_SYNC_KEY = 'waitme.dev.profilePendingSync'
const AUTOSAVE_DEBOUNCE_MS = 600
const shellStyle = { backgroundColor: colors.background }

export default function ProfilePage() {
  const { openHome } = useAppScreen()
  const {
    user: sessionUser,
    signOut,
    markProfileComplete,
    headerProfile,
    profile,
    setProfile,
    profileBootstrapReady,
  } = useAuth()

  const canRenderProfile = Boolean(profileBootstrapReady && sessionUser && profile)

  const [savedProfile, setSavedProfile] = useState(() => {
    const seed = profile ?? seedProfileStateFromSession(sessionUser ?? null)
    return { ...seed }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState('idle')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile)
  const autosaveTimerRef = useRef(null)
  const autosaveInFlightRef = useRef(false)
  const autosavePendingRef = useRef(false)
  const profileRef = useRef(profile)
  const savedProfileRef = useRef(savedProfile)
  const sessionUserIdRef = useRef(sessionUser?.id ?? null)
  const autosaveStatusRef = useRef('idle')

  const fieldErrors = submitAttempted
    ? {
        full_name: String(profile?.full_name ?? '').trim() ? '' : 'Indica tu nombre',
        plate:
          String(profile?.plate ?? '').replace(/\s/g, '').length >= 4
            ? ''
            : 'Introduce tu matrícula',
        brand: String(profile?.brand ?? '').trim() ? '' : 'Indica la marca',
        model: String(profile?.model ?? '').trim() ? '' : 'Indica el modelo',
        phone:
          String(profile?.phone ?? '').replace(/\s/g, '').length >= 6
            ? ''
            : 'Añade un teléfono válido',
      }
    : {}
  const canContinue =
    String(profile?.full_name ?? '').trim().length > 0 &&
    String(profile?.plate ?? '').replace(/\s/g, '').length >= 4 &&
    String(profile?.brand ?? '').trim().length > 0 &&
    String(profile?.model ?? '').trim().length > 0 &&
    String(profile?.phone ?? '').replace(/\s/g, '').length >= 6

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
    autosaveStatusRef.current = autosaveStatus
  }, [autosaveStatus])

  useEffect(() => {
    if (!sessionUser?.id) {
      void signOut()
      return
    }

    const sessionSeed = seedProfileStateFromSession(sessionUser)
    let cancelled = false
    ;(async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (!cancelled) {
            const seed = sessionSeed
            let draft = null
            try {
              const raw = window.localStorage?.getItem?.(PROFILE_DRAFT_KEY)
              draft = raw ? JSON.parse(raw) : null
            } catch {
              draft = null
            }
            const base = {
              ...(draft && typeof draft === 'object' ? draft : EMPTY_APP_PROFILE),
              full_name: (draft?.full_name || '').trim() ? draft.full_name : seed.full_name,
              email: (draft?.email || '').trim() ? draft.email : seed.email,
              avatar_url: (draft?.avatar_url || '').trim() ? draft.avatar_url : seed.avatar_url,
            }
            setProfile((prev) => ({
              ...prev,
              ...base,
              full_name: prev.full_name || base.full_name,
              email: prev.email || base.email,
              avatar_url: prev.avatar_url || base.avatar_url,
            }))
            setSavedProfile((prev) => ({
              ...prev,
              ...base,
              full_name: prev.full_name || base.full_name,
              email: prev.email || base.email,
              avatar_url: prev.avatar_url || base.avatar_url,
            }))
          }
          return
        }
        const remoteUser = await getCurrentUser()
        if (cancelled) return
        /** `getUser()` puede fallar o ir vacío un instante tras OAuth; no cerrar sesión si el contexto sigue con id. */
        const userId = remoteUser?.id ?? sessionUser?.id
        if (!userId) {
          void signOut()
          return
        }

        const { data, error } = await getProfile(userId)
        if (cancelled) return
        if (error) return
        if (data) {
          const serverProfile = { ...data }
          try {
            const raw = window.localStorage?.getItem?.(PROFILE_DRAFT_KEY)
            const draft = raw ? JSON.parse(raw) : null
            if (draft && typeof draft === 'object') {
              serverProfile.phone = draft.phone || serverProfile.phone
              serverProfile.brand = draft.brand || serverProfile.brand
              serverProfile.model = draft.model || serverProfile.model
              serverProfile.plate = draft.plate || serverProfile.plate
              serverProfile.color = draft.color || serverProfile.color
              serverProfile.vehicle_type = draft.vehicle_type || serverProfile.vehicle_type
            }
          } catch {
            /* */
          }
          setProfile((prev) => ({
            ...prev,
            ...serverProfile,
            full_name: prev.full_name || serverProfile.full_name,
            email: prev.email || serverProfile.email,
            avatar_url: prev.avatar_url || serverProfile.avatar_url,
          }))
          setSavedProfile((prev) => ({
            ...prev,
            ...serverProfile,
            full_name: prev.full_name || serverProfile.full_name,
            email: prev.email || serverProfile.email,
            avatar_url: prev.avatar_url || serverProfile.avatar_url,
          }))
        }
      } catch (e) {
        console.error('[WaitMe][ProfilePage] carga inicial excepción', e)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una carga por id; evita flash al refrescar metadata
  }, [sessionUser?.id, signOut])

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
        const remoteUser = await getCurrentUser()
        const userId = remoteUser?.id ?? sessionUserIdRef.current
        if (!userId) {
          void signOut()
          return
        }
        const { data, error } = await updateProfile(userId, currentProfile)
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
  }, [signOut, setProfile])

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
  }, [runAutosave, setProfile])

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
    if (!checkProfileComplete(profile ?? EMPTY_APP_PROFILE)) return
    if (!canContinue) return
    if (hasChanges || isSaving || autosaveStatusRef.current === 'saving') {
      await flushAutosave()
    }
    if (autosaveStatusRef.current === 'error') {
      await flushAutosave()
      if (autosaveStatusRef.current === 'error') return
    }
    const saved = profileRef.current
    if (!checkProfileComplete(saved)) return
    markProfileComplete(saved)
    setSavedProfile(saved)
    logFlow('PROFILE_SAVED', { mode: isSupabaseConfigured() ? 'supabase' : 'dev-local' })
    logFlow('NAVIGATE_HOME')
    openHome?.()
  }, [profile, canContinue, hasChanges, isSaving, flushAutosave, markProfileComplete, openHome])

  const handleLogout = useCallback(async () => {
    await signOut()
  }, [signOut])

  const profileHeaderReviewsAvg = useMemo(() => getAverage(getReviewsForScreen()), [])

  if (!canRenderProfile) {
    return null
  }

  return (
    <ScreenShell
      style={shellStyle}
      contentStyle={profileReviewsShellContentStyle}
      mainMode={SCREEN_SHELL_MAIN_MODE.INSET}
      mainOverflow="hidden"
    >
      <ProfileReviewsLayout
        scrollBody={false}
        header={
          <ProfileHeader
            profile={headerProfile}
            avatarBorder={profileScreenAvatarBorder}
            averageRating={profileHeaderReviewsAvg}
            surface="profile"
            subjectUserId={sessionUser?.id ?? ''}
          />
        }
      >
        <div style={profileFormVerticalSlotStyleNoScroll}>
          <Section style={profileFormSectionLayoutStyle}>
            <ProfileForm
              value={profile ?? EMPTY_APP_PROFILE}
              onChange={setProfile}
              errors={fieldErrors}
            />
          </Section>
        </div>
        <div style={profileActionsFooterStyle}>
          <div style={layoutActionsStyle}>
            <Button
              type="button"
              variant="profileSave"
              disabled={!hasChanges}
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
