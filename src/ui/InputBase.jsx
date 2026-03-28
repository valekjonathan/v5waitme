import { forwardRef, useState } from 'react'
import { colors } from '../design/colors'
import { radius } from '../design/radius'
import { LAYOUT } from './layout/layout'

const s = LAYOUT.spacing

const baseStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
  borderRadius: radius.small,
  height: 36,
  padding: `0 ${s.md}px`,
  fontSize: 14,
  outline: 'none',
  textAlign: 'center',
  fontFamily: 'inherit',
}

const InputBase = forwardRef(function InputBase({ style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      ref={ref}
      style={{
        ...baseStyle,
        transition: 'border-color 140ms ease-out, box-shadow 140ms ease-out',
        borderColor: focused ? colors.primary : colors.border,
        boxShadow: focused ? '0 0 0 2px rgba(168, 85, 247, 0.15)' : 'none',
        ...style,
      }}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      {...rest}
    />
  )
})

export default InputBase
