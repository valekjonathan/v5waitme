const stackBaseStyle = {
  display: 'flex',
  flexDirection: 'column',
}

function stackStyle(gap, style) {
  return {
    ...stackBaseStyle,
    gap,
    ...style,
  }
}

export const Stack = ({ children, gap = 12, style = {} }) => (
  <div style={stackStyle(gap, style)}>{children}</div>
)
