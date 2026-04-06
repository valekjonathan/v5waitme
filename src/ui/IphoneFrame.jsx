const isDevDesktop =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  window.location.hostname === 'localhost' &&
  window.innerWidth > 768

/** Solo la primera instancia en el árbol pinta el marco (main.jsx); AppLayout sigue usando IphoneFrame sin doble marco. */
let devIphoneFrameShellApplied = false

export default function IphoneFrame({ children }) {
  if (!isDevDesktop) return children

  if (devIphoneFrameShellApplied) {
    return children
  }
  devIphoneFrameShellApplied = true

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
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
