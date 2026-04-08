export default function IphoneFrame({ children }) {
  const isDesktop = window.innerWidth > 500

  if (!isDesktop) {
    // MODO REAL (iPhone / Safari móvil)
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {children}
      </div>
    )
  }

  // MODO ESCRITORIO (simulación iPhone)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'black',
      }}
    >
      <div
        style={{
          width: 390,
          height: 844,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 40,
          background: '#000',
        }}
      >
        {children}
      </div>
    </div>
  )
}
