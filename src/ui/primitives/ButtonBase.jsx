function rootStyle(style) {
  return { ...buttonBase, ...style }
}

export default function ButtonBase({ icon, label, style = {} }) {
  return (
    <div style={rootStyle(style)}>
      <div style={buttonContent}>
        <div style={iconSlot}>{icon}</div>
        <div style={textSlot}>{label}</div>
      </div>
    </div>
  )
}

ButtonBase.displayName = 'ButtonBase'

const buttonBase = {
  width: '100%',
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const buttonContent = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  justifyContent: 'center',
}

const iconSlot = {
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const textSlot = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}
