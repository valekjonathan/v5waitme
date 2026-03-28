const rowBaseStyle = {
  display: 'flex',
  flexDirection: 'row',
}

function rowStyle(gap, align, style) {
  return {
    ...rowBaseStyle,
    alignItems: align,
    gap,
    ...style,
  }
}

export const Row = ({ children, gap = 12, align = 'center', style = {} }) => (
  <div style={rowStyle(gap, align, style)}>{children}</div>
)
