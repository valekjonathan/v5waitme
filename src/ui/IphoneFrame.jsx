const devPhoneFrameStyle = {
  width: 390,
  height: 844,
  margin: '40px auto',
  borderRadius: 40,
  overflow: 'hidden',
  background: '#000',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
}

/**
 * Solo Safari Mac + localhost + ventana ancha: marco fijo para orientar el layout.
 * No producción; iPhone real y PWA no cumplen estas condiciones.
 */
export default function IphoneFrame({ children }) {
  if (
    typeof window !== 'undefined' &&
    import.meta.env.DEV &&
    window.location.hostname === 'localhost' &&
    window.innerWidth > 768
  ) {
    return <div style={devPhoneFrameStyle}>{children}</div>
  }
  return children
}
