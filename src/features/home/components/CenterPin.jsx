import { colors } from '../../../design/colors'
import { shadows } from '../../../design/shadows'

const PIN_STYLE_TAG = `
@keyframes center-pin-pulse {
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 1px rgba(255,255,255,1), 0 0 15px rgba(168,85,247,0.8); }
  50% { opacity: 0.85; transform: scale(1.08); box-shadow: 0 0 0 1px rgba(255,255,255,1), 0 0 22px rgba(168,85,247,0.95); }
}
@keyframes center-pin-radar {
  0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.5); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(2.5); }
}
@keyframes center-pin-halo {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
@keyframes pinPulse {
  0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
  70% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
}
.center-pin-ball { animation: center-pin-pulse 2s ease-in-out infinite; }
.center-pin-radar-ring { animation: center-pin-radar 2.5s ease-out infinite; }
.center-pin-halo-ring { animation: center-pin-halo 2s ease-in-out infinite; }
.center-pin-pulse-halo { animation: pinPulse 2s infinite; }
`

const ballShadow = {
  boxShadow: shadows.centerPinBall,
}

const stemShadow = { boxShadow: shadows.centerPinStem }

/** Posición común de anillos absolutos; no deben interceptar toques (Safari/WKWebView). */
const absRingBase = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
}

export default function CenterPin() {
  return (
    <div
      data-center-pin
      style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        width: 18,
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <style>{PIN_STYLE_TAG}</style>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          className="center-pin-pulse-halo"
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: 64,
            height: 64,
            borderRadius: 999,
            border: `2px solid ${colors.centerPinLilacStrong}`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden
        />
        <div
          className="center-pin-halo-ring"
          style={{
            ...absRingBase,
            width: 48,
            height: 48,
            borderRadius: 999,
            border: `2px solid ${colors.centerPinLilac}`,
          }}
        />
        <div
          className="center-pin-radar-ring"
          style={{
            ...absRingBase,
            width: 64,
            height: 64,
            borderRadius: 999,
            border: `1px solid ${colors.centerPinLilacStrong}`,
          }}
        />
        <div
          className="center-pin-radar-ring"
          style={{
            ...absRingBase,
            width: 64,
            height: 64,
            borderRadius: 999,
            border: `1px solid ${colors.centerPinLilacStrong}`,
            animationDelay: '0.8s',
          }}
        />
        <div
          className="center-pin-ball"
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            background: colors.primary,
            ...ballShadow,
          }}
        />
      </div>
      <div style={{ height: 36, width: 2, background: colors.primary, ...stemShadow }} />
    </div>
  )
}
