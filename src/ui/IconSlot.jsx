export default function IconSlot({ size = 24, children, style, ...rest }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        pointerEvents: 'none',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}
