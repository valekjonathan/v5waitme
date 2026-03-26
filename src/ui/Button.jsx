import { useState, forwardRef } from 'react'
import { colors } from '../design/colors'
import { spacing, spacingExact } from '../design/spacing'
import { radius } from '../design/radius'

const entryBtnBase = {
  display: 'inline-flex',
  minHeight: 64,
  height: 64,
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacingExact.entryButtonGap,
  whiteSpace: 'nowrap',
  borderRadius: radius.xxl,
  padding: `0 ${spacing.lg}px`,
  fontSize: 16,
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const navButtonShared = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: colors.primary,
  height: spacingExact.bottomNavHeight,
  borderRadius: radius.medium,
  margin: '0 4px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const variantStyles = {
  primary: {
    ...entryBtnBase,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.textPrimary,
  },
  secondary: {
    ...entryBtnBase,
    border: 0,
    background: colors.primaryStrong,
    color: colors.textPrimary,
  },
  danger: {
    width: '100%',
    marginTop: spacing.sm,
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: radius.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    border: `1.5px solid ${colors.danger}`,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  ghost: {
    cursor: 'pointer',
    border: 0,
    background: 'transparent',
    padding: 0,
    margin: 0,
    fontFamily: 'inherit',
  },
  ghostProfile: {
    cursor: 'pointer',
    border: 0,
    background: 'transparent',
    padding: 0,
    marginLeft: spacing.sm,
    fontFamily: 'inherit',
  },
  nav: {
    ...navButtonShared,
    border: 0,
    background: 'transparent',
  },
  navActive: {
    ...navButtonShared,
    border: `1px solid ${colors.primaryBorderMuted}`,
    background: colors.primaryMutedBg,
  },
  profileSave: {
    width: '100%',
    marginTop: spacing.lg,
    marginBottom: 0,
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: radius.xl,
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    border: `2px solid ${colors.primary}`,
    color: colors.textPrimary,
    background: colors.primaryStrong,
  },
  profileSaveDisabled: {
    width: '100%',
    marginTop: spacing.lg,
    marginBottom: 0,
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: radius.xl,
    cursor: 'not-allowed',
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    border: `2px solid ${colors.primaryTint}`,
    color: colors.textDisabled,
    background: colors.primaryTint,
  },
  reviews: {
    width: 96,
    height: 28,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.large,
    border: `1.5px solid ${colors.accentYellow}`,
    background: colors.accentYellowStrong,
    color: colors.whiteAlt,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  selectTrigger: {
    position: 'relative',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'center',
    height: 44,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    color: colors.textPrimary,
    borderRadius: radius.small,
    fontFamily: 'inherit',
  },
  menuRow: {
    width: '100%',
    border: 0,
    background: 'transparent',
    color: colors.textPrimary,
    textAlign: 'left',
    borderRadius: radius.small,
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
}

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    disabled,
    style,
    children,
    onMouseEnter,
    onMouseLeave,
    type = 'button',
    ...rest
  },
  ref
) {
  const [hover, setHover] = useState(false)

  const base =
    variant === 'profileSave' && disabled
      ? variantStyles.profileSaveDisabled
      : variantStyles[variant] || variantStyles.primary

  const dangerHover =
    variant === 'danger' ? { backgroundColor: hover ? colors.dangerBgHover : colors.dangerBg } : {}

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      style={{
        ...base,
        ...dangerHover,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (variant === 'danger') setHover(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (variant === 'danger') setHover(false)
        onMouseLeave?.(e)
      }}
      {...rest}
    >
      {children}
    </button>
  )
})

export default Button
