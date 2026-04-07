import { DEV_WEB_IPHONE_SIM_MIN_INNER_WIDTH } from '../lib/devWebIphoneSim.js'

const isDevDesktop =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  window.location.hostname === 'localhost' &&
  window.innerWidth > DEV_WEB_IPHONE_SIM_MIN_INNER_WIDTH

/** Primera instancia en el árbol = marco (main.jsx); la de AppLayout es passthrough sin segundo marco. */
let devIphoneFrameShellClaimed = false

export default function IphoneFrame({ children }) {
  const isShell = isDevDesktop && !devIphoneFrameShellClaimed
  if (isShell) {
    devIphoneFrameShellClaimed = true
  }

  if (!isDevDesktop) return children
  if (!isShell) return children

  return (
    <div
      style={{
        width: '100%',
        minHeight: 'var(--app-height, 100dvh)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111',
      }}
    >
      <div
        style={{
          width: 390,
          height: 844,
          borderRadius: 40,
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
