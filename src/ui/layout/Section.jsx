function sectionStyle(gap, align, style) {
  return {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap,
    alignItems: align,
    ...style,
  }
}

export default function Section({ children, gap = 12, align = 'stretch', style = {} }) {
  return <section style={sectionStyle(gap, align, style)}>{children}</section>
}
