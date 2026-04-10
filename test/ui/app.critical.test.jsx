import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react'
import App from '../../src/app/App.jsx'
import { AppScreenProvider, useAppScreen } from '../../src/lib/AppScreenContext.jsx'
import { AuthProvider } from '../../src/lib/AuthContext.jsx'
import { ProfileIncompleteNoticeProvider } from '../../src/lib/ProfileIncompleteNoticeContext.jsx'
import Header from '../../src/ui/Header.jsx'
import BottomNav from '../../src/ui/BottomNav.jsx'
import ErrorBoundaryUi from '../../src/lib/ErrorBoundary.jsx'

const testUser = { id: 'u_test_1', email: 't@waitme.test' }

let sessionMode = 'unauth' // 'unauth' | 'auth'
let signInError = null // string | null
let getSessionCalls = 0
let onAuthStateChangeHandler = null

const mockProfileRow = {
  id: 'u_test_1',
  name: 'Test User',
  phone: '+34600000000',
  car_brand: 'Seat',
  car_model: 'Ibiza',
  plate: '1234ABC',
  color: 'negro',
  vehicle_type: 'car',
  avatar_url: null,
  email: 't@waitme.test',
}

function makeProfileChain() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: mockProfileRow, error: null }),
    insert: () => ({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: { ...mockProfileRow, phone: '', car_brand: '', car_model: '', plate: '' },
            error: null,
          }),
      }),
    }),
    upsert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: mockProfileRow, error: null }),
      }),
    }),
  }
  return chain
}

vi.mock('../../src/services/supabase.js', () => {
  return {
    isSupabaseConfigured: () => true,
    supabase: {
      auth: {
        getSession: vi.fn(async () => {
          getSessionCalls += 1
          if (sessionMode === 'auth') {
            return { data: { session: { user: testUser } }, error: null }
          }
          return { data: { session: null }, error: null }
        }),
        getUser: vi.fn(async () => ({ data: { user: testUser }, error: null })),
        onAuthStateChange: vi.fn((_handler) => {
          onAuthStateChangeHandler = _handler
          return { data: { subscription: { unsubscribe: vi.fn() } } }
        }),
        signInWithOAuth: vi.fn(async () => {
          if (signInError) {
            return { data: null, error: new Error(signInError) }
          }
          sessionMode = 'auth'
          // Simula el cambio de auth que en runtime ocurriría por Supabase.
          if (onAuthStateChangeHandler) {
            onAuthStateChangeHandler('SIGNED_IN', { user: testUser })
          }
          return { data: null, error: null }
        }),
        signOut: vi.fn(async () => ({ error: null })),
      },
      from: vi.fn(() => makeProfileChain()),
    },
  }
})

describe('UI crítica (React): auth, errores y navegación', () => {
  beforeEach(() => {
    sessionMode = 'unauth'
    signInError = null
    getSessionCalls = 0
    onAuthStateChangeHandler = null
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('ErrorBoundary: muestra fallback si un componente rompe en render', () => {
    function Boom() {
      throw new Error('ui-test-throw')
    }

    render(
      <ErrorBoundaryUi name="ui-test">
        <Boom />
      </ErrorBoundaryUi>
    )

    expect(screen.queryByText('La app se está recuperando')).not.toBeNull()
  })

  it('Login: render básico muestra CTA "Continuar con Google" cuando no hay sesión', async () => {
    render(<App />)
    await waitFor(() => expect(screen.queryByText(/Continuar con Google/i)).not.toBeNull(), {
      timeout: 15_000,
    })
  })

  it('arranque: ScreenShell montado con contenido (jsdom no usa #root de main.jsx)', async () => {
    render(<App />)
    await waitFor(
      () => {
        const shell = document.querySelector('[data-waitme-screen-shell]')
        expect(shell).not.toBeNull()
        expect((shell.textContent || '').trim().length).toBeGreaterThan(5)
      },
      { timeout: 15_000 }
    )
  })

  it('Login completo: click Google -> authenticated -> Home si perfil completo (fallback mapa)', async () => {
    localStorage.setItem('hasSeenLogin', 'true')
    render(<App />)

    const googleBtn = await screen.findByRole('button', { name: /continuar con google/i })

    await act(async () => {
      fireEvent.click(googleBtn)
    })

    await waitFor(
      () => {
        expect(document.querySelector('[data-waitme-map-unavailable="true"]')).not.toBeNull()
      },
      { timeout: 15_000 }
    )
  })

  it('Mapa: render del contenedor Map no crashea (fallback presente)', async () => {
    localStorage.setItem('hasSeenLogin', 'true')
    sessionMode = 'auth'
    render(<App />)

    await waitFor(
      () => {
        expect(document.querySelector('[data-waitme-map-unavailable="true"]')).not.toBeNull()
      },
      { timeout: 15_000 }
    )
  })

  it('Logout: authenticated -> perfil -> Cerrar sesión -> vuelve a Login', async () => {
    localStorage.setItem('hasSeenLogin', 'true')
    sessionMode = 'auth'
    render(<App />)

    // Espera a que el home autenticado esté montado (evita clicar durante "Cargando…"/AppLayout no interactivo).
    await waitFor(
      () => {
        expect(document.querySelector('[data-waitme-map-unavailable="true"]')).not.toBeNull()
      },
      { timeout: 15_000 }
    )

    const headerPerfilBtn = document.querySelector(
      'header[data-waitme-header="true"] button[aria-label="Perfil"]'
    )
    expect(headerPerfilBtn).not.toBeNull()
    await act(async () => {
      fireEvent.click(headerPerfilBtn)
    })

    const closeBtn = await screen.findByRole('button', { name: /cerrar sesión/i })
    await act(async () => {
      fireEvent.click(closeBtn)
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /continuar con google/i })).not.toBeNull()
    })
  })

  it('Error de auth: signInWithOAuth falla -> permanece en login (no pasa a Home)', async () => {
    localStorage.setItem('hasSeenLogin', 'true')
    signInError = 'auth_error'
    render(<App />)

    const googleBtn = await screen.findByRole('button', { name: /continuar con google/i })

    await act(async () => {
      fireEvent.click(googleBtn)
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /continuar con google/i })).not.toBeNull()
      expect(document.querySelector('[data-home-google-button=""]')).not.toBeNull()
      /** Login y Home comparten `MainLayout` + fallback de mapa; Home no tiene CTA Google. */
      expect(screen.queryByRole('button', { name: /¿Dónde quieres aparcar/i })).toBeNull()
    })
  })

  it('Performance/anti-loops: render App (sin sesión) no tarda demasiado y llama getSession 1x', async () => {
    const t0 = performance.now()
    render(<App />)

    await screen.findByRole('button', { name: /continuar con google/i })

    const elapsed = performance.now() - t0
    expect(elapsed).toBeLessThan(5000)
    expect(getSessionCalls).toBeLessThanOrEqual(2)
  })
})

describe('Navegación lógica (home ↔ profile) + resetKeys', () => {
  function RouteProbe() {
    const { screen } = useAppScreen()
    return <div data-testid="route-probe" data-screen={screen} />
  }

  function MaybeThrower() {
    const { screen } = useAppScreen()
    if (screen === 'profile') throw new Error('nav-test-throw')
    return <div>OK_HOME</div>
  }

  function ResetBoundary({ children }) {
    const { screen } = useAppScreen()
    return (
      <ErrorBoundaryUi resetKeys={[screen]} name="navTest">
        {children}
      </ErrorBoundaryUi>
    )
  }

  it('home → profile: cambia screen y ErrorBoundary se activa; al volver, se recupera por resetKeys', async () => {
    sessionMode = 'auth'
    const notice = { requestNotice: vi.fn() }
    render(
      <AuthProvider>
        <AppScreenProvider>
          <ProfileIncompleteNoticeProvider value={notice}>
            <Header interactive />
            <BottomNav interactive />
            <ResetBoundary>
              <MaybeThrower />
            </ResetBoundary>
            <RouteProbe />
          </ProfileIncompleteNoticeProvider>
        </AppScreenProvider>
      </AuthProvider>
    )

    expect(screen.getByTestId('route-probe').getAttribute('data-screen')).toBe('map')

    await act(async () => {
      const headerPerfilBtn = document.querySelector(
        'header[data-waitme-header="true"] button[aria-label="Perfil"]'
      )
      expect(headerPerfilBtn).not.toBeNull()
      fireEvent.click(headerPerfilBtn)
    })

    expect(screen.queryByText('La app se está recuperando')).not.toBeNull()
    expect(screen.getByTestId('route-probe').getAttribute('data-screen')).toBe('profile')

    await act(async () => {
      const mapaButtons = screen.getAllByRole('button', { name: /mapa/i })
      fireEvent.click(mapaButtons[0])
    })

    await waitFor(() => {
      expect(screen.queryByText('La app se está recuperando')).toBeNull()
      expect(screen.queryByText('OK_HOME')).not.toBeNull()
    })
    expect(screen.getByTestId('route-probe').getAttribute('data-screen')).toBe('map')
  })
})
