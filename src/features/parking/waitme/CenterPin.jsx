/**
 * Copia de WaitMe: src/components/CenterPin.jsx
 */
export default function WaitMeCenterPin({ top, className = '' }) {
  return (
    <div
      data-center-pin
      className={className}
      style={{
        position: 'absolute',
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        left: '50%',
        transform: 'translateX(-50%)',
        top: typeof top === 'number' ? `${top}px` : 'calc(50% - 60px)',
        width: 18,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 9999,
          backgroundColor: '#a855f7',
          boxShadow: '0 0 15px rgba(168,85,247,0.8)',
        }}
      />
      <div
        style={{
          width: 2,
          height: 36,
          backgroundColor: '#a855f7',
        }}
      />
    </div>
  )
}
