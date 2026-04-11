export default function IphoneFrame({ children }) {
  const isDesktop = window.innerWidth > 500

  if (!isDesktop) {
    // MODO REAL (iPhone / Safari móvil)
    /** `flex` + `minHeight:0` llena el padre en columna; `height:100%` solo suele fallar en WKWebView. */
    return (
      <div
        style={{
          width: '100%',
          flex: '1 1 0%',
          minHeight: 0,
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
          width: '100%',
          maxWidth: 390,
          height: '100%',
          maxHeight: 844,
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
