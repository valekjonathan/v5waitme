import { useEffect } from 'react'

const isDevDesktop =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  window.location.hostname === 'localhost' &&
  window.innerWidth > 768

/** Primera instancia en el árbol = marco (main.jsx); la de AppLayout es passthrough sin segundo marco ni viewport duplicado. */
let devIphoneFrameShellClaimed = false

export default function IphoneFrame({ children }) {
  const isShell = isDevDesktop && !devIphoneFrameShellClaimed
  if (isShell) {
    devIphoneFrameShellClaimed = true
  }

  useEffect(() => {
    if (!isDevDesktop || !isShell) return

    const meta = document.querySelector('meta[name=viewport]')
    if (meta) {
      meta.setAttribute(
        'content',
        'width=390, initial-scale=1, maximum-scale=1, user-scalable=no'
      )
    }
  }, [isShell])

  if (!isDevDesktop) return children
  if (!isShell) return children

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
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
