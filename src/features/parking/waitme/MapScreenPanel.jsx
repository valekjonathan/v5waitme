/**
 * Copia estructural de WaitMe: src/system/map/MapScreenPanel.jsx
 * Posicionamiento inferior + padding sobre bottom nav.
 */
export default function MapScreenPanel({
  children,
  className = '',
  style = {},
  cardShiftUp = 0,
  overflowHidden = false,
  measureLabel,
  ...rest
}) {
  const gapPx = Math.max(0, 22 - cardShiftUp)
  const isCard = measureLabel === 'create' || measureLabel === 'navigate'
  const innerStyle = isCard ? { minHeight: 260, maxHeight: 300 } : { maxHeight: 'min(55vh, 340px)' }

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: cardShiftUp,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 20,
        paddingBottom: `calc(${gapPx}px + var(--bottom-nav-h, calc(64px + env(safe-area-inset-bottom, 0px))))`,
        ...style,
      }}
      data-map-screen-panel
      {...rest}
    >
      <div
        data-map-screen-panel-inner
        style={{
          width: '92%',
          maxWidth: 460,
          pointerEvents: 'auto',
          minHeight: 200,
          ...innerStyle,
          overflowY: overflowHidden ? 'hidden' : 'auto',
          overscrollBehavior: overflowHidden ? 'none' : 'contain',
          touchAction: overflowHidden ? 'none' : 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
