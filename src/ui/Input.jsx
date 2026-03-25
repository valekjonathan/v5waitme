import { forwardRef } from 'react'
import { colors } from '../design/colors'
import { radius } from '../design/radius'

const inputFieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  borderRadius: radius.small,
  height: 36,
  padding: '0 12px',
  fontSize: 14,
  outline: 'none',
  textAlign: 'center',
  fontFamily: 'inherit',
}

const Input = forwardRef(function Input({ style, ...rest }, ref) {
  return <input ref={ref} style={{ ...inputFieldStyle, ...style }} {...rest} />
})

export default Input
