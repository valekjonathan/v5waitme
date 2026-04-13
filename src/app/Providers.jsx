import { AppScreenProvider } from '../lib/AppScreenContext'
import { AppAuthRoot } from '../lib/AuthContext'

/**
 * Auth + navegación de pantalla; envoltura estable para `AppLayout` → `ScreenShell` → rutas.
 * @param {{ children: import('react').ReactNode }} props
 */
export function Providers({ children }) {
  return (
    <AppAuthRoot>
      <AppScreenProvider>{children}</AppScreenProvider>
    </AppAuthRoot>
  )
}
